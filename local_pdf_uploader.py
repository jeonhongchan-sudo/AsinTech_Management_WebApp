import os
import sys
import io
import re
import requests
import threading
import pdfplumber
import fitz  # PyMuPDF
import boto3
from botocore.config import Config
from PIL import Image
import tkinter as tk
from tkinter import filedialog, scrolledtext, messagebox
from supabase import create_client

# 1. 한글 인코딩 에러 ('ascii' codec) 해결을 위한 스트림 설정
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

# Cloudflare Worker 정보 (js/core.js 참조)
WORKER_URL = "https://asin-r2-worker.jeonhongchan.workers.dev"
WORKER_AUTH_KEY = "asin_tech_secret_2024"
GAS_URL = "https://script.google.com/macros/s/AKfycbyBjiUmdE_ISu1Uk-3zwb75owaRWNIyRZu-RgAqmvxvvAho8RsGotvqF4PnHZ34_1r6/exec"

class PDFUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("아신테크 지침서 업데이트 도구 (파일별 갱신)")
        self.root.geometry("750x600")
        self.supabase_client = None
        self.s3_client = None
        self.r2_config = {}

        self.setup_ui()
        self.load_remote_config()

    def load_remote_config(self):
        """다른 프로그램(asin_app.py 등)과 동일하게 GAS에서 Supabase와 R2 설정을 각각 가져옵니다."""
        self.log("🛰️ 서버에서 접속 정보를 가져오는 중...")
        try:
            # 1. Supabase 설정 가져오기 (action=getSupabaseConfig)
            supa_res = requests.get(f"{GAS_URL}?action=getSupabaseConfig", timeout=10)
            supa_res.raise_for_status()
            supa_config = supa_res.json()

            if supa_config.get("success"):
                self.supabase_client = create_client(supa_config["url"], supa_config["key"])
                self.log("[✅] Supabase 연결 정보 로드 완료")
            else:
                self.log(f"[❌] Supabase 설정 로드 실패: {supa_config.get('error')}")

            # 2. R2 설정 가져오기 (action=getR2Config)
            r2_res = requests.get(f"{GAS_URL}?action=getR2Config", timeout=10)
            r2_res.raise_for_status()
            r2_cfg = r2_res.json()

            if r2_cfg.get("success"):
                self.r2_config = r2_cfg
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=r2_cfg["R2_Endpoints"],
                    aws_access_key_id=r2_cfg["R2_Access_Key_ID"],
                    aws_secret_access_key=r2_cfg["R2_Secret_Access_Key"],
                    region_name="auto",
                    config=Config(signature_version='s3v4')
                )
                self.log("[✅] R2(Cloudflare) 연결 성공 및 버킷 확인 완료")
            else:
                self.log(f"[❌] R2 설정 로드 실패: {r2_cfg.get('error')}")
        except Exception as e:
            self.log(f"[❌] 설정 로드 실패: {e}")
            messagebox.showerror("오류", f"서버 설정을 가져올 수 없습니다.\n{e}")

    def setup_ui(self):
        # 안내 문구
        info_label = tk.Label(self.root, text="※ 업로드 시 동일한 파일명이 DB에 있으면 해당 데이터만 삭제 후 갱신합니다.", fg="#f44336", font=("Malgun Gothic", 9))
        info_label.pack(pady=5)

        # 상단 버튼 영역
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=10)

        self.btn_select = tk.Button(btn_frame, text="1. PDF 파일 선택", command=self.select_files, width=20, bg="#2196F3", fg="white", font=("Malgun Gothic", 10, "bold"))
        self.btn_select.grid(row=0, column=0, padx=5)

        self.btn_start = tk.Button(btn_frame, text="2. 업로드 및 갱신", command=self.start_upload_thread, width=20, bg="#4CAF50", fg="white", state=tk.DISABLED, font=("Malgun Gothic", 10, "bold"))
        self.btn_start.grid(row=0, column=1, padx=5)

        self.btn_delete = tk.Button(btn_frame, text="3. 기존 데이터 삭제", command=self.show_delete_dialog, width=20, bg="#f44336", fg="white", font=("Malgun Gothic", 10, "bold"))
        self.btn_delete.grid(row=0, column=2, padx=5)

        # 로그 출력 영역
        self.log_area = scrolledtext.ScrolledText(self.root, width=90, height=30, font=("Malgun Gothic", 10))
        self.log_area.pack(padx=15, pady=10)

        self.selected_files = []

    def log(self, message):
        self.log_area.insert(tk.END, str(message) + "\n")
        self.log_area.see(tk.END)

    def select_files(self):
        self.selected_files = filedialog.askopenfilenames(title="업로드할 PDF 선택", filetypes=[("PDF files", "*.pdf")])
        if self.selected_files:
            self.log(f"\n--- {len(self.selected_files)}개의 파일 선택됨 ---")
            for f in self.selected_files: self.log(f" > {os.path.basename(f)}")
            self.btn_start.config(state=tk.NORMAL)

    def upload_to_r2(self, body, key, content_type):
        """R2에 파일을 업로드하고 접근 가능한 Public URL을 반환합니다."""
        self.s3_client.put_object(
            Bucket=self.r2_config["R2_BUCKET_NAME"],
            Key=key,
            Body=body,
            ContentType=content_type
        )
        base_url = self.r2_config["R2_Public_Url"].rstrip('/')
        return f"{base_url}/{key}"

    def delete_r2_folder(self, folder_prefix):
        """R2에서 특정 접두사(폴더)를 가진 모든 파일을 삭제합니다."""
        try:
            bucket_name = self.r2_config["R2_BUCKET_NAME"]
            # 대량의 파일을 안전하게 삭제하기 위해 페이지네이터 사용
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket_name, Prefix=folder_prefix)

            total_deleted = 0
            for page in pages:
                if 'Contents' in page:
                    delete_keys = [{'Key': obj['Key']} for obj in page['Contents']]
                    self.s3_client.delete_objects(
                        Bucket=bucket_name,
                        Delete={'Objects': delete_keys}
                    )
                    total_deleted += len(delete_keys)
            
            if total_deleted > 0:
                self.log(f"[*] R2 자원 정리 완료 ({total_deleted}개 파일 삭제)")
            else:
                self.log("[*] R2에 삭제할 기존 자원이 없습니다.")
        except Exception as e:
            self.log(f"[⚠️] R2 자원 정리 중 오류 (무시하고 진행): {e}")

    def clean_text_quality(self, text):
        if not text: return ""
        text = text.replace('\0', '')
        text = re.sub(r'([\.?!,])(?=\S)', r'\1 ', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def start_upload_thread(self):
        if not self.supabase_client:
            return messagebox.showwarning("준비 중", "서버 설정 로딩 중입니다. 잠시만 기다려주세요.")
            
        msg = "선택한 파일들과 동일한 이름의 기존 데이터는 삭제되고 새로 업데이트됩니다.\n진행하시겠습니까?"
        if not messagebox.askyesno("업데이트 확인", msg):
            return
            
        self.btn_start.config(state=tk.DISABLED)
        self.btn_select.config(state=tk.DISABLED)
        self.btn_delete.config(state=tk.DISABLED)
        threading.Thread(target=self.process_uploads, daemon=True).start()

    def fetch_existing_filenames(self):
        """Supabase 'pdf_knowledge' 테이블에서 이미 업로드된 고유한 파일명 목록을 가져옵니다 (전체 조회를 위한 페이지네이션 적용)."""
        if not self.supabase_client: return []
        all_filenames = set()
        limit = 1000
        offset = 0
        try:
            self.log("[*] Supabase DB 레코드 검색 중...")
            while True:
                # PostgREST는 한 번에 가져오는 양에 제한이 있으므로 range를 사용하여 전체를 읽음
                res = self.supabase_client.table("pdf_knowledge") \
                    .select("file_name") \
                    .range(offset, offset + limit - 1) \
                    .execute()
                
                if not res.data:
                    break
                
                for item in res.data:
                    all_filenames.add(item['file_name'])
                
                # 가져온 데이터가 limit보다 작으면 마지막 페이지임
                if len(res.data) < limit:
                    break
                    
                offset += limit
                self.log(f"  - {offset}개 레코드 확인 중...")

            return sorted(list(all_filenames))
        except Exception as e:
            self.log(f"[❌] 파일 목록 조회 실패: {e}")
            return []

    def show_delete_dialog(self):
        """삭제할 파일 목록을 보여주는 모달 창을 띄웁니다."""
        self.log("\n🛰️ 서버에서 기존 파일 목록 조회 중...")
        files = self.fetch_existing_filenames()
        if not files:
            self.log("[!] 삭제할 수 있는 데이터가 없습니다.")
            return messagebox.showinfo("정보", "삭제할 데이터가 없습니다.")

        delete_win = tk.Toplevel(self.root)
        delete_win.title("기존 데이터 삭제")
        delete_win.geometry("450x550")
        delete_win.grab_set() # 모달 동작 (메인 창 조작 방지)

        tk.Label(delete_win, text="삭제할 파일을 선택하세요 (다중 선택 가능)", font=("Malgun Gothic", 10, "bold")).pack(pady=10)

        # 스크롤 가능한 영역 구성
        container = tk.Frame(delete_win)
        container.pack(fill=tk.BOTH, expand=True, padx=15, pady=5)
        
        canvas = tk.Canvas(container)
        scrollbar = tk.Scrollbar(container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        vars_dict = {}
        for f in files:
            var = tk.BooleanVar()
            cb = tk.Checkbutton(scrollable_frame, text=f, variable=var, font=("Malgun Gothic", 9), anchor="w", justify=tk.LEFT)
            cb.pack(fill=tk.X, padx=5, pady=2)
            vars_dict[f] = var

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        def on_confirm():
            selected = [f for f, v in vars_dict.items() if v.get()]
            if not selected:
                return messagebox.showwarning("경고", "삭제할 파일을 하나 이상 선택해주세요.")
            
            if messagebox.askyesno("최종 확인", f"선택한 {len(selected)}개의 파일 정보를 Supabase와 R2에서 영구 삭제합니다.\n정말 진행하시겠습니까?"):
                delete_win.destroy()
                threading.Thread(target=self.execute_deletion, args=(selected,), daemon=True).start()

        btn_confirm = tk.Button(delete_win, text="데이터 삭제 실행", command=on_confirm, bg="#f44336", fg="white", font=("Malgun Gothic", 10, "bold"), height=2)
        btn_confirm.pack(fill=tk.X, padx=15, pady=15)

    def execute_deletion(self, file_names):
        """실제 삭제 로직을 실행합니다."""
        self.btn_start.config(state=tk.DISABLED)
        self.btn_select.config(state=tk.DISABLED)
        self.btn_delete.config(state=tk.DISABLED)
        
        try:
            for name in file_names:
                self.log(f"\n🗑️ '{name}' 데이터 제거 시작...")
                
                # 1. R2 자원(이미지, 표 WebP) 폴더 삭제
                self.delete_r2_folder(f"knowledge_assets/{name}/")
                
                # 2. Supabase DB 레코드 삭제
                self.supabase_client.table("pdf_knowledge").delete().eq("file_name", name).execute()
                
                self.log(f"[✅] '{name}' 관련 모든 데이터 제거 완료")
            
            self.log("\n[✨] 요청하신 모든 삭제 작업이 완료되었습니다.")
            messagebox.showinfo("삭제 완료", f"{len(file_names)}개의 파일 데이터가 정상적으로 제거되었습니다.")
        except Exception as e:
            self.log(f"[❌] 삭제 중 오류 발생: {e}")
        finally:
            self.btn_select.config(state=tk.NORMAL)
            self.btn_delete.config(state=tk.NORMAL)
            # 업로드할 파일이 선택된 상태면 시작 버튼 활성화
            self.btn_start.config(state=tk.NORMAL if self.selected_files else tk.DISABLED)

    def process_uploads(self):
        for file_path in self.selected_files:
            file_name = os.path.basename(file_path)
            self.log(f"\n🚀 '{file_name}' 작업 시작...")

            try:
                # [핵심] 1. 해당 파일명의 기존 데이터만 삭제
                self.log(f"[*] 기존 데이터 정리 중 ('{file_name}')...")
                delete_res = self.supabase_client.table("pdf_knowledge").delete().eq("file_name", file_name).execute()
                
                # [추가] R2 저장소의 기존 이미지/표 폴더 정리
                self.delete_r2_folder(f"knowledge_assets/{file_name}/")
                
                # 2. PDF 분석 (pdfplumber + fitz 혼합 사용)
                all_chunks = []
                doc = fitz.open(file_path)
                with pdfplumber.open(file_path) as pdf_plumb:
                    for i, page in enumerate(pdf_plumb.pages):
                        raw_text = page.extract_text() or ""
                        fitz_page = doc[i]
                        
                        table_urls = []
                        image_urls = []
                        
                        # [추가] 목차(Index) 감지 로직
                        is_index = False
                        first_lines = raw_text.strip().split('\n')[:5]
                        header_check = "".join(first_lines).replace(" ", "").upper()
                        if any(kw in header_check for kw in ["목차", "CONTENTS", "INDEX"]):
                            is_index = True

                        table_data = ""
                        # [개선] find_tables()를 주력으로 사용하여 표 데이터와 영역(bbox)을 동기화합니다.
                        found_tables = page.find_tables()
                        if found_tables:
                            for t_idx, table_obj in enumerate(found_tables):
                                table = table_obj.extract()
                                if not table: continue
                                for row_idx, row in enumerate(table):
                                    cells = [str(c).replace('\n', ' ') if c else "" for c in row]
                                    table_data += "| " + " | ".join(cells) + " |\n"
                                    if row_idx == 0: # 헤더 바로 다음에 구분선(|---|) 삽입
                                        table_data += "| " + " | ".join(["---"] * len(cells)) + " |\n"
                                table_data += "\n"

                                # [수정] 표 영역을 SVG가 아닌 WebP 썸네일로 추출하여 R2 업로드
                                try:
                                    t_bbox = table_obj.bbox
                                    temp_doc = fitz.open()
                                    width, height = t_bbox[2] - t_bbox[0], t_bbox[3] - t_bbox[1]
                                    temp_page = temp_doc.new_page(width=width, height=height)
                                    temp_page.show_pdf_page(temp_page.rect, doc, i, clip=fitz.Rect(t_bbox))
                                    
                                    pix = temp_page.get_pixmap(dpi=150)
                                    if pix.colorspace.n != 3 or pix.alpha:
                                        pix = fitz.Pixmap(fitz.csRGB, pix)
                                    
                                    img_obj = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                                    img_obj.thumbnail((800, 800))
                                    webp_io = io.BytesIO()
                                    img_obj.save(webp_io, format="WEBP", quality=75)
                                    webp_io.seek(0)
                                    temp_doc.close()

                                    r2_key = f"knowledge_assets/{file_name}/p{i+1}_table_{t_idx}.webp"
                                    webp_url = self.upload_to_r2(webp_io.getvalue(), r2_key, "image/webp")
                                    table_urls.append(webp_url)
                                except Exception as e:
                                    self.log(f"  - 표 WebP 변환 실패 (p.{i+1}): {e}")

                        # [추가] 이미지 객체 추출 및 WebP 썸네일 업로드
                        try:
                            images = fitz_page.get_images()
                            for img_idx, img in enumerate(images):
                                xref = img[0]
                                pix = fitz.Pixmap(doc, xref)
                                
                                # [수정] 색상 영역이 RGB가 아니거나(그레이스케일, CMYK 등) 투명도(Alpha)가 있는 경우 
                                # Pillow 호환을 위해 강제로 표준 RGB로 변환합니다.
                                if pix.colorspace.n != 3 or pix.alpha:
                                    pix = fitz.Pixmap(fitz.csRGB, pix)
                                
                                # Pillow를 이용해 WebP 썸네일 생성
                                img_obj = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                                img_obj.thumbnail((800, 800)) # 최대 800px 썸네일
                                
                                webp_io = io.BytesIO()
                                img_obj.save(webp_io, format="WEBP", quality=75)
                                webp_io.seek(0)
                                
                                r2_key = f"knowledge_assets/{file_name}/p{i+1}_img_{img_idx}.webp"
                                img_url = self.upload_to_r2(webp_io.getvalue(), r2_key, "image/webp")
                                image_urls.append(img_url)
                                pix = None # 메모리 해제
                        except Exception as e:
                            self.log(f"  - 이미지 추출 실패 (p.{i+1}): {e}")        
                        
                        text_content = self.clean_text_quality(raw_text)
                        
                        # 데이터 구조화
                        combined = f"#### 출처: {file_name} (p.{i+1}) ####\n\n"
                        if table_data.strip():
                            combined += "##### [표 데이터] #####\n" + table_data + "\n"
                        combined += "##### [지침 내용] #####\n" + text_content
                        
                        all_chunks.append({
                            "page": i + 1, "text": combined, "is_index": is_index,
                            "table_urls": table_urls, "image_urls": image_urls
                        })

                self.log(f"[*] 총 {len(all_chunks)}페이지 삽입 중...")
                
                # 데이터가 너무 많을 경우를 대비해 10개씩 묶어서 업로드(Batch)
                batch_size = 10
                for j in range(0, len(all_chunks), batch_size):
                    batch = all_chunks[j:j+batch_size]
                    
                    # DB 삽입용 페이로드 생성
                    db_payload = []
                    for chunk in batch:
                        db_payload.append({
                            "project_id": "GENERAL",
                            "file_name": file_name,
                            "content": chunk["text"],  # 순수 텍스트(text 타입)로 저장
                            "metadata": {"page": chunk["page"], "is_index": chunk.get("is_index", False)},
                            "table_svg_urls": chunk["table_urls"],
                            "image_urls": chunk["image_urls"]
                        })

                    if db_payload:
                        self.supabase_client.table("pdf_knowledge").insert(db_payload).execute()
                    
                    current_pos = min(j + batch_size, len(all_chunks))
                    self.log(f"  - [{current_pos}/{len(all_chunks)}] 페이지 완료")
                doc.close()

                self.log(f"[✅] '{file_name}' 업데이트 성공!")

            except Exception as e:
                self.log(f"[❌] '{file_name}' 처리 중 치명적 오류: {e}")
                print(e)

        self.log("\n[✨] 모든 선택 파일의 업데이트가 끝났습니다.")
        messagebox.showinfo("완료", "지침서 업데이트가 성공적으로 완료되었습니다.")
        
        self.btn_select.config(state=tk.NORMAL)
        self.btn_delete.config(state=tk.NORMAL)
        self.selected_files = []

if __name__ == "__main__":
    root = tk.Tk()
    app = PDFUploaderApp(root)
    root.mainloop()