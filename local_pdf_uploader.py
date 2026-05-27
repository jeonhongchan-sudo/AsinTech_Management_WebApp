import os
import sys
import io
import re
import requests
import threading
import pdfplumber
import tkinter as tk
from tkinter import filedialog, scrolledtext, messagebox
from supabase import create_client

# 1. 한글 인코딩 에러 ('ascii' codec) 해결을 위한 스트림 설정
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

# Cloudflare Worker 정보 (js/core.js 참조)
WORKER_URL = "https://asin-r2-worker.jeonhongchan.workers.dev"
WORKER_AUTH_KEY = "asin_tech_secret_2024"

class PDFUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("아신테크 지침서 업데이트 도구 (파일별 갱신)")
        self.root.geometry("750x600")
        self.supabase_client = None

        self.setup_ui()
        self.load_remote_config()

    def load_remote_config(self):
        """Worker에서 Supabase 설정을 가져옵니다."""
        self.log("🛰️ 서버에서 접속 정보를 가져오는 중...")
        try:
            headers = {"Authorization": WORKER_AUTH_KEY}
            response = requests.get(f"{WORKER_URL}/config", headers=headers, timeout=10)
            response.raise_for_status()
            config = response.json()
            
            if config.get("success"):
                self.supabase_client = create_client(config["url"], config["key"])
                self.log("[✅] 서버 연결 성공")
            else:
                raise Exception("Worker 응답 내 설정 정보가 없습니다.")
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

    def clean_text_quality(self, text):
        if not text: return ""
        # 유니코드 제어 문자 및 불필요한 공백 제거
        text = text.replace('\0', '')
        text = re.sub(r'([\.?!,])(?=\S)', r'\1 ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def start_upload_thread(self):
        if not self.supabase_client:
            return messagebox.showwarning("준비 중", "서버 설정 로딩 중입니다. 잠시만 기다려주세요.")
            
        msg = "선택한 파일들과 동일한 이름의 기존 데이터는 삭제되고 새로 업데이트됩니다.\n진행하시겠습니까?"
        if not messagebox.askyesno("업데이트 확인", msg):
            return
            
        self.btn_start.config(state=tk.DISABLED)
        self.btn_select.config(state=tk.DISABLED)
        threading.Thread(target=self.process_uploads, daemon=True).start()

    def process_uploads(self):
        for file_path in self.selected_files:
            file_name = os.path.basename(file_path)
            self.log(f"\n🚀 '{file_name}' 작업 시작...")

            try:
                # [핵심] 1. 해당 파일명의 기존 데이터만 삭제
                self.log(f"[*] 기존 데이터 정리 중 ('{file_name}')...")
                # file_name 컬럼이 일치하는 것만 삭제 요청
                delete_res = self.supabase_client.table("pdf_knowledge").delete().eq("file_name", file_name).execute()
                
                # 2. PDF 분석 및 마크다운 표 추출
                all_chunks = []
                with pdfplumber.open(file_path) as pdf:
                    for i, page in enumerate(pdf.pages):
                        table_data = ""
                        tables = page.extract_tables()
                        if tables:
                            for table in tables:
                                for row in table:
                                    cells = [str(c).replace('\n', ' ') if c else "" for c in row]
                                    table_data += "| " + " | ".join(cells) + " |\n"
                                table_data += "\n"
                        
                        raw_text = page.extract_text() or ""
                        text_content = self.clean_text_quality(raw_text)
                        
                        # 데이터 구조화
                        combined = f"### 출처: {file_name} (p.{i+1}) ###\n\n"
                        if table_data.strip(): 
                            combined += "#### [표 데이터] ####\n" + table_data + "\n"
                        combined += "#### [지침 내용] ####\n" + text_content
                        
                        all_chunks.append({"page": i + 1, "text": combined})

                # 3. 새로운 데이터 삽입 (embedding은 NULL로 두어 새벽에 처리되게 함)
                self.log(f"[*] 총 {len(all_chunks)}페이지 삽입 중...")
                
                # 데이터가 너무 많을 경우를 대비해 10개씩 묶어서 업로드(Batch)
                batch_size = 10
                for j in range(0, len(all_chunks), batch_size):
                    batch = all_chunks[j:j+batch_size]
                    payload = []
                    for chunk in batch:
                        payload.append({
                            "project_id": "GENERAL",
                            "file_name": file_name,
                            "content": chunk["text"],
                            "embedding": None, # 새벽 3시에 GitHub Action이 채움
                            "metadata": {"page": chunk["page"]}
                        })
                    
                    self.supabase_client.table("pdf_knowledge").insert(payload).execute()
                    
                    current_pos = min(j + batch_size, len(all_chunks))
                    self.log(f"  - [{current_pos}/{len(all_chunks)}] 페이지 완료")

                self.log(f"[✅] '{file_name}' 업데이트 성공!")

            except Exception as e:
                self.log(f"[❌] '{file_name}' 처리 중 치명적 오류: {e}")
                print(e)

        self.log("\n[✨] 모든 선택 파일의 업데이트가 끝났습니다.")
        self.log("💡 비어있는 벡터(Embedding)는 새벽 3시에 자동으로 생성됩니다.")
        messagebox.showinfo("완료", "지침서 업데이트가 성공적으로 완료되었습니다.")
        
        self.btn_select.config(state=tk.NORMAL)
        self.selected_files = []

if __name__ == "__main__":
    root = tk.Tk()
    app = PDFUploaderApp(root)
    root.mainloop()