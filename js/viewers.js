// e:\Program\SelfProgram\아신테크\js\viewers.js
import { state, callApi, callSupabaseDirect, showAlert, R2_BASE_URL } from './core.js';
import { UIS_DATA, ROAD_LEDGER_ITEMS, PDF_TOC_DATA, NETWORK_RTK_DATA, NON_CONFORMITY_CASES_DATA, NUMERIC_MAP_DATA, GNSS_NOTICE_DATA, PUBLIC_SURVEY_FAQ_DATA, REGULATION_REVISION_DATA, MATERIAL_ABBREVIATION_DATA, PUBLIC_SURVEY_REGULATIONS_DATA } from './data.js';

// --- PDF Viewer Logic ---
let pdfCache = {};
let currentPdfType = 'road';
let pdfDoc = null, pageNum = 1, pageRendering = false, pageNumPending = null, scale = 1.0; 
let canvas, ctx;
let isPdfLoading = false;
const PAGE_OFFSET = 14; 

export function initPdfViewer() {
    canvas = document.getElementById('pdf-canvas');
    if(canvas) ctx = canvas.getContext('2d');
    
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
    
    if (window.innerWidth < 992) scale = 0.6;
    window.addEventListener('resize', () => { scale = (window.innerWidth < 992) ? 0.6 : 1.0; });
}

export function selectGuideline(type) {
    document.querySelectorAll('.guide-menu-item').forEach(b => b.classList.remove('active'));
    document.getElementById('menu-guide-' + type)?.classList.add('active');

    const titleEl = document.getElementById('currentPdfTitle');
    const pdfContainer = document.getElementById('pdfContainer');
    const uisContainer = document.getElementById('uisCodeTableContainer');
    const rtkContainer = document.getElementById('networkRtkContainer');
    const ncContainer = document.getElementById('nonConformityContainer');
    const roadContainer = document.getElementById('roadLedgerTocContainer');
    const numericContainer = document.getElementById('numericMapContainer');
    const gnssContainer = document.getElementById('gnssNoticeContainer');
    const faqContainer = document.getElementById('faqContainer');
    const revisionContainer = document.getElementById('regulationRevisionContainer');
    const materialContainer = document.getElementById('materialAbbrContainer');
    const publicSurveyRegContainer = document.getElementById('publicSurveyRegContainer');
    const loadingMsg = document.getElementById('pdf-loading-msg');
    const tocToggleBtn = document.querySelector('.pdf-mobile-toc-toggle');

    pdfContainer.style.display = 'none';
    uisContainer.style.display = 'none';
    if(rtkContainer) rtkContainer.style.display = 'none';
    if(ncContainer) ncContainer.style.display = 'none';
    if(roadContainer) roadContainer.style.display = 'none';
    if(numericContainer) numericContainer.style.display = 'none';
    if(gnssContainer) gnssContainer.style.display = 'none';
    if(faqContainer) faqContainer.style.display = 'none';
    if(publicSurveyRegContainer) publicSurveyRegContainer.style.display = 'none';
    if(materialContainer) materialContainer.style.display = 'none';
    if(revisionContainer) revisionContainer.style.display = 'none';
    loadingMsg.style.display = 'none';
    
    currentPdfType = type;

    if (type === 'uis') {
        titleEl.innerText = 'UIS 시설물 측량 코드표';
        uisContainer.style.display = 'block';
        renderUISTable();
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'rtk') {
        titleEl.innerText = NETWORK_RTK_DATA.title;
        if(rtkContainer) {
            rtkContainer.style.display = 'block';
            renderNetworkRtk();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'nonConformity') {
        titleEl.innerText = NON_CONFORMITY_CASES_DATA.title;
        if(ncContainer) {
            ncContainer.style.display = 'block';
            renderNonConformityCases();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'road') {
        titleEl.innerText = '2024 도로대장 작성 지침';
        if(roadContainer) {
            roadContainer.style.display = 'block';
            renderRoadLedgerTOC();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'numericMap') {
        titleEl.innerText = NUMERIC_MAP_DATA.title;
        if(numericContainer) {
            numericContainer.style.display = 'block';
            renderNumericMap();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'gnssNotice') {
        titleEl.innerText = GNSS_NOTICE_DATA.title;
        if(gnssContainer) {
            gnssContainer.style.display = 'block';
            renderGnssNotice();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'faq') {
        titleEl.innerText = PUBLIC_SURVEY_FAQ_DATA.title;
        if(faqContainer) {
            faqContainer.style.display = 'block';
            renderPublicSurveyFaq();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'regulationRevision') {
        titleEl.innerText = REGULATION_REVISION_DATA.documentTitle;
        if(revisionContainer) {
            revisionContainer.style.display = 'block';
            renderRegulationRevision();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'materialAbbr') {
        titleEl.innerText = MATERIAL_ABBREVIATION_DATA.documentTitle;
        if(materialContainer) {
            materialContainer.style.display = 'block';
            renderMaterialAbbr();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else if (type === 'publicSurveyReg') {
        titleEl.innerText = PUBLIC_SURVEY_REGULATIONS_DATA.documentTitle;
        if(publicSurveyRegContainer) {
            publicSurveyRegContainer.style.display = 'block';
            renderPublicSurveyRegulations();
        }
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    } else {
        if(tocToggleBtn) tocToggleBtn.style.display = 'none';
    }
}

function loadPdf(type, isBackground = false) { 
  if(pdfCache[type]) return; 
  isPdfLoading = true;
  const loadingMsg = document.getElementById('pdf-loading-msg');
  
  if (!isBackground) {
      loadingMsg.style.display = 'block';
      loadingMsg.innerText = '문서를 불러오는 중입니다...';
      document.getElementById('pdfContainer').style.display = 'none';
  }

  const action = 'getNumericMapPdf'; // road는 이제 PDF 뷰어를 사용하지 않음
  callApi(action).then(r => { 
    if(r.success) { 
        pdfjsLib.getDocument({data:atob(r.data)}).promise.then(p => { 
            pdfCache[type] = p;
            isPdfLoading = false;
            if (currentPdfType === type && document.getElementById('guidelines-tab').classList.contains('active')) {
                pdfDoc = p;
                pageNum = 1;
                document.getElementById('page_count').textContent = p.numPages;
                renderPage(pageNum);
                loadingMsg.style.display = 'none';
                document.getElementById('pdfContainer').style.display = 'flex';
            }
        }); 
    } else { throw new Error(r.error); }
  }).catch(err => {
      isPdfLoading = false;
      if(!isBackground && currentPdfType === type) {
         loadingMsg.innerHTML = `문서 로드 실패. <button onclick="window.selectGuideline('${type}')" class="btn btn-primary">다시 시도</button><br><small>${err}</small>`;
      }
  }); 
}

function renderPage(n) { pageRendering=true; pdfDoc.getPage(n).then(p => { const vp=p.getViewport({scale:scale}); canvas.width=vp.width; canvas.height=vp.height; p.render({canvasContext:ctx, viewport:vp}).promise.then(() => { pageRendering=false; if(pageNumPending){ renderPage(pageNumPending); pageNumPending=null; } }); document.getElementById('page_num').textContent=n; }); }
function queueRenderPage(n) { pageRendering ? pageNumPending=n : renderPage(n); }
export function changePage(o) { if(pdfDoc && pageNum+o>=1 && pageNum+o<=pdfDoc.numPages) { pageNum+=o; queueRenderPage(pageNum); } }
export function zoomIn() { scale+=0.25; queueRenderPage(pageNum); }
export function zoomOut() { if(scale>0.4) scale-=0.25; queueRenderPage(pageNum); }
export function toggleFullScreen() {
    const mapContainer = document.getElementById('cad-map');
    const pdfContainer = document.getElementById('pdfContainer');

    let elementToFullscreen = null;
    if (document.getElementById('cadViewer-tab')?.classList.contains('active')) {
        elementToFullscreen = mapContainer;
    } else if (document.getElementById('guidelines-tab')?.classList.contains('active')) {
        elementToFullscreen = pdfContainer || document.querySelector('.pdf-container');
    }

    if (!elementToFullscreen) return;

    if (!document.fullscreenElement) {
        elementToFullscreen.requestFullscreen().catch(err => console.error(`전체화면 오류: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}
export function toggleSidebar() { document.getElementById('pdfSidebar').classList.toggle('open'); }

function renderRoadLedgerTOC() {
    const container = document.getElementById('roadLedgerTocContainer');
    if (container.innerHTML.trim() !== '') return;
    
    const tocData = PDF_TOC_DATA['Contents (목차)'];
    const pdfBaseUrl = "https://drive.google.com/file/d/1mysxDT9bfxcdh2-DXDW9NLnOZOCRQ7lF/view?usp=drive_link";
    
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:15px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">2024 도로대장 작성 지침 목차</h2>
                <a href="${pdfBaseUrl}" target="_blank" class="btn btn-primary" style="text-decoration:none;">📄 PDF</a>
             </div>`;
    
    html += `<div class="toc-list" style="display:flex; flex-direction:column; gap:8px;">`;
    
    tocData.forEach(item => {
        // 실제 PDF 페이지 = 목차 페이지 + 옵셋(14)
        const realPage = item.page + PAGE_OFFSET;
        const link = `${pdfBaseUrl}#page=${realPage}`;
        
        html += `<a href="${link}" target="_blank" style="display:flex; justify-content:space-between; padding:12px 15px; background:#f8f9fa; border:1px solid #eee; border-radius:5px; text-decoration:none; color:#333; transition:background 0.2s;">
                    <span style="font-weight:500;">${item.title}</span>
                    <span style="color:#007bff; font-size:0.9em;">p.${item.page} (PDF p.${realPage})</span>
                 </a>`;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
}

function renderUISTable() {
    const container = document.getElementById('uisCodeTableContainer');
    if (container.innerHTML.trim() !== '') return;
    if (!UIS_DATA) return;
    let html = `<table class="uis-table"><thead><tr><th>명칭</th><th style="width:15%">코드</th><th style="width:15%">형태</th></tr></thead><tbody>`;
    UIS_DATA.forEach(group => {
        html += `<tr><td colspan="3" class="uis-group-header">${group.category}</td></tr>`;
        group.items.forEach(item => {
            let nameDisplay = item.name + (ROAD_LEDGER_ITEMS.has(item.name) ? ` <span class="badge-ledger">도</span>` : '');
            html += `<tr><td style="text-align:left;padding-left:20px;">${nameDisplay}</td><td style="font-family:monospace;font-weight:bold;">${item.code}</td><td>${item.type}</td></tr>`;
        });
    });
    container.innerHTML = html + `</tbody></table>`;
}

function renderNetworkRtk() {
    const container = document.getElementById('networkRtkContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NETWORK_RTK_DATA;
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<h2 style="text-align: center; margin-bottom: 10px;">${data.title}</h2>`;
    html += `<p style="text-align: right; font-weight: bold; color: #555;">${data.effectiveDate}</p>`;
    data.sections.forEach(section => {
        html += `<div style="margin-top: 30px;"><h3 style="border-left: 5px solid #007bff; padding-left: 10px; margin-bottom: 15px;">${section.sectionNumber}. ${section.heading}</h3>`;
        if (section.subHeading) html += `<p style="font-weight: bold; margin-bottom: 10px;">${section.subHeading}</p>`;
        if (section.details) { html += `<ul style="margin-bottom: 15px; padding-left: 20px;">`; section.details.forEach(d => html += `<li>${d}</li>`); html += `</ul>`; }
        if (section.note) html += `<p style="color: #d63384; font-size: 0.9em; margin-bottom: 10px;">${section.note}</p>`;
        if (section.addressChangeTable) {
            html += `<table class="uis-table" style="margin-bottom: 15px;"><thead><tr><th>변경 전</th><th>변경 후</th></tr></thead><tbody>`;
            section.addressChangeTable.forEach(row => html += `<tr><td>${row.before}</td><td>${row.after}</td></tr>`);
            html += `</tbody></table>`;
        }
        if (section.serviceNameChangeTable) {
            const rows = section.serviceNameChangeTable;
            // 병합 정보를 계산하기 위한 배열 초기화
            const rowSpans = rows.map(() => ({ addr: 0, info: 0 }));
            
            for (let i = 0; i < rows.length; i++) {
                // 1. 접속주소 병합 계산
                if (i === 0 || rows[i].connectionAddress !== rows[i-1].connectionAddress) {
                    let span = 1;
                    for (let j = i + 1; j < rows.length; j++) {
                        if (rows[j].connectionAddress === rows[i].connectionAddress) span++; else break;
                    }
                    rowSpans[i].addr = span;
                }
                
                // 2. 서비스 정보(명칭, 내용, 심사여부) 병합 계산
                // 이전 행과 접속주소 및 서비스 정보가 모두 같으면 병합 대상(span=0)
                const isSameAsPrev = i > 0 && rows[i].connectionAddress === rows[i-1].connectionAddress && rows[i].serviceNameAfter === rows[i-1].serviceNameAfter && rows[i].serviceContent === rows[i-1].serviceContent && rows[i].publicSurveyPerformanceReviewAvailability === rows[i-1].publicSurveyPerformanceReviewAvailability;
                
                if (!isSameAsPrev) {
                    let span = 1;
                    for (let j = i + 1; j < rows.length; j++) {
                        const isSame = rows[j].connectionAddress === rows[i].connectionAddress && rows[j].serviceNameAfter === rows[i].serviceNameAfter && rows[j].serviceContent === rows[i].serviceContent && rows[j].publicSurveyPerformanceReviewAvailability === rows[i].publicSurveyPerformanceReviewAvailability;
                        if (isSame) span++; else break;
                    }
                    rowSpans[i].info = span;
                }
            }

            html += `<div style="overflow-x: auto;"><table class="uis-table" style="min-width: 800px;"><thead><tr><th>접속주소</th><th>서비스명(변경전)</th><th>서비스명(변경후)</th><th>서비스 내용</th><th>공공측량 성과심사 가능여부</th></tr></thead><tbody>`;
            rows.forEach((row, i) => {
                html += `<tr>`;
                // 접속주소 (병합 처리)
                if (rowSpans[i].addr > 0) html += `<td rowspan="${rowSpans[i].addr}" style="vertical-align: middle; background: #fff;">${row.connectionAddress}</td>`;
                
                html += `<td>${row.serviceNameBefore}</td>`;
                
                // 서비스 정보 (병합 처리)
                if (rowSpans[i].info > 0) {
                    const isRed = row.serviceNameAfter === 'RTK-RTCM32' || row.serviceNameAfter === 'SSR-SSRG';
                    const color = isRed ? '#dc3545' : '#007bff';
                    html += `<td rowspan="${rowSpans[i].info}" style="vertical-align: middle; font-weight: bold; color: ${color}; background: #fff;">${row.serviceNameAfter}</td>`;
                    html += `<td rowspan="${rowSpans[i].info}" style="vertical-align: middle; background: #fff;">${row.serviceContent}</td>`;
                    html += `<td rowspan="${rowSpans[i].info}" style="vertical-align: middle; text-align: center; background: #fff;">${row.publicSurveyPerformanceReviewAvailability}</td>`;
                }
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
    });
    html += `<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center;"><h4 style="margin: 0;">${data.footer.organization}</h4><p style="margin: 5px 0 0; color: #666;">${data.footer.contact}</p></div></div>`;
    container.innerHTML = html;
}

function renderNonConformityCases() {
    const container = document.getElementById('nonConformityContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NON_CONFORMITY_CASES_DATA;
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    
    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <h4 style="color:#555; margin-bottom:5px;">${data.subtitle}</h4>
                <p style="color:#666; font-size:0.9em; margin-bottom: 10px;">발행: ${data.publicationInfo.publisher} (${data.publicationInfo.date})</p>
                <a href="https://drive.google.com/file/d/1UMnxoPJjZ4NM_KNTTsk6oAMfz-l_qqgb/view?usp=drive_link" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;

    data.contents.forEach(chapter => {
        html += `<div style="margin-top: 30px;">`;
        html += `<h3 style="border-left: 5px solid #dc3545; padding-left: 10px; margin-bottom: 15px; color: #333;">${chapter.chapter}. ${chapter.title}</h3>`;
        
        if (chapter.sections) {
            chapter.sections.forEach(sec => {
                html += `<h4 style="margin-top:15px; margin-bottom:10px;">${sec.heading}</h4>`;
                if (sec.terms) {
                    html += `<ul style="background:#f9f9f9; padding:15px 15px 15px 30px; border-radius:5px;">`;
                    sec.terms.forEach(t => html += `<li style="margin-bottom:5px;"><strong>${t.term}:</strong> ${t.def}</li>`);
                    html += `</ul>`;
                }
            });
        }

        if (chapter.stats) {
            html += `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">`;
            chapter.stats.forEach(stat => {
                html += `<div style="flex:1; min-width:120px; background:#f1f3f5; padding:15px; text-align:center; border-radius:8px;">
                            <div style="font-size:0.9em; color:#666;">${stat.label}</div>
                            <div style="font-size:1.2em; font-weight:bold; color:#007bff;">${stat.value}</div>
                         </div>`;
            });
            html += `</div>`;
        }

        if (chapter.nonConformityStats) {
            html += `<h4 style="margin-bottom:10px;">${chapter.nonConformityStats.title}</h4>`;
            html += `<table class="uis-table"><thead><tr><th>유형</th><th>건수</th></tr></thead><tbody>`;
            chapter.nonConformityStats.details.forEach(row => {
                html += `<tr><td>${row.type}</td><td style="text-align:center;">${row.count}</td></tr>`;
            });
            html += `</tbody></table>`;
        }

        if (chapter.cases) {
            chapter.cases.forEach((c, idx) => {
                html += `<div style="border:1px solid #eee; padding:15px; margin-bottom:10px; border-radius:5px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                            <h4 style="margin:0 0 10px 0; color:#d63384;">${c.title}</h4>
                            <p><strong>문제점:</strong> ${c.issue}</p>
                            <p style="margin-top:5px; color:#666; font-size:0.95em;">${c.detail}</p>
                         </div>`;
            });
        }

        if (chapter.solutions) {
            html += `<table class="uis-table"><thead><tr><th>원인</th><th>해결방안</th></tr></thead><tbody>`;
            chapter.solutions.forEach(sol => {
                html += `<tr><td>${sol.cause}</td><td>${sol.solution}</td></tr>`;
            });
            html += `</tbody></table>`;
        }

        html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderNumericMap() {
    const container = document.getElementById('numericMapContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NUMERIC_MAP_DATA;
    
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    
    // Header with PDF Button
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;

    data.content.forEach(section => {
        html += `<div style="margin-bottom: 25px;">`;
        html += `<h3 style="border-left: 5px solid #28a745; padding-left: 10px; margin-bottom: 15px; color: #333;">${section.heading}</h3>`;
        if (section.text) {
            html += `<p style="line-height: 1.6; color: #555;">${section.text}</p>`;
        }
        if (section.table) {
            html += `<table class="uis-table"><thead><tr><th>축척</th><th>도엽번호 예시</th><th>설명</th></tr></thead><tbody>`;
            section.table.forEach(row => {
                html += `<tr><td>${row.scale}</td><td style="font-family:monospace; font-weight:bold;">${row.example}</td><td>${row.desc}</td></tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function renderGnssNotice() {
    const container = document.getElementById('gnssNoticeContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = GNSS_NOTICE_DATA;
    
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    
    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;

    // Main Notice
    html += `<div style="background-color: #fff3cd; color: #856404; padding: 20px; border-radius: 5px; border: 1px solid #ffeeba; margin-bottom: 25px;">
                <p style="font-size: 1.1em; font-weight: bold; margin-bottom: 10px;">${data.mainNotice.text}</p>
                <p style="font-size: 0.9em; margin-bottom: 10px;">${data.mainNotice.footnote}</p>
                <p style="color: #dc3545; font-weight: bold;">※ ${data.mainNotice.warning}</p>
             </div>`;

    // Checkpoints
    html += `<h3 style="border-left: 5px solid #007bff; padding-left: 10px; margin-bottom: 15px; color: #333;">주요 준수 사항</h3>`;
    html += `<ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 5px; margin-bottom: 30px;">`;
    data.checkpoints.forEach(pt => {
        html += `<li style="margin-bottom: 8px; font-weight: 500;">${pt}</li>`;
    });
    html += `</ul>`;

    // Regulations
    html += `<h3 style="border-left: 5px solid #28a745; padding-left: 10px; margin-bottom: 15px; color: #333;">관련 규정</h3>`;
    data.regulations.forEach(reg => {
        html += `<div style="margin-bottom: 20px;"><h4 style="margin-bottom: 8px; color: #555;">${reg.title}</h4><div style="padding: 15px; border: 1px solid #eee; border-radius: 5px;">`;
        reg.content.forEach(c => html += `<p style="margin-bottom: 5px;">${c}</p>`);
        if(reg.note) html += `<p style="margin-top: 10px; font-size: 0.9em; color: #666;">${reg.note}</p>`;
        html += `</div></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderPublicSurveyFaq() {
    const container = document.getElementById('faqContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = PUBLIC_SURVEY_FAQ_DATA;
    
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    
    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <p style="color:#666; font-size:0.9em; margin-bottom: 10px;">발행: ${data.publisher}</p>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;

    data.chapters.forEach(chapter => {
        html += `<div style="margin-top: 30px;">`;
        html += `<h3 style="border-left: 5px solid #667eea; padding-left: 10px; margin-bottom: 20px; color: #333;">${chapter.chapterNumber}. ${chapter.chapterTitle}</h3>`;
        
        chapter.questions.forEach(q => {
            html += `<div style="margin-bottom: 25px; border: 1px solid #eee; border-radius: 8px; padding: 15px; background: #fcfcfc;">`;
            html += `<h4 style="margin-bottom: 10px; color: #007bff;">Q${q.qId}. ${q.question}</h4>`;
            
            if (q.answer) {
                html += `<p style="margin-bottom: 10px; line-height: 1.6;">${q.answer}</p>`;
            }
            if (q.note) {
                html += `<p style="font-size: 0.9em; color: #666; background: #f1f1f1; padding: 8px; border-radius: 4px;">※ ${q.note}</p>`;
            }

            // 각종 테이블 및 리스트 처리
            if (q.processSteps) {
                html += `<table class="uis-table"><thead><tr><th>단계</th><th>내용</th><th>주체</th></tr></thead><tbody>`;
                q.processSteps.forEach(step => html += `<tr><td style="text-align:center;">${step.step}</td><td>${step.action}</td><td>${step.actor}</td></tr>`);
                html += `</tbody></table>`;
            }
            if (q.relatedRegulations) {
                html += `<ul style="list-style-type: disc; padding-left: 20px; margin-top: 10px;">`;
                q.relatedRegulations.forEach(reg => html += `<li style="margin-bottom: 5px;"><strong>${reg.regulationName}</strong> ${reg.reference ? `(${reg.reference})` : ''}</li>`);
                html += `</ul>`;
            }
            if (q.process) {
                html += `<ol style="padding-left: 20px; margin-top: 10px;">`;
                q.process.forEach(p => html += `<li style="margin-bottom: 5px;">${p}</li>`);
                html += `</ol>`;
            }
            if (q.facilityScope) {
                html += `<ul style="list-style-type: disc; padding-left: 20px; margin-top: 10px;">`;
                q.facilityScope.forEach(item => html += `<li style="margin-bottom: 5px;">${item}</li>`);
                html += `</ul>`;
            }
            if (q.lodTable) {
                html += `<table class="uis-table"><thead><tr><th>기준</th><th>세밀도(Level)</th><th>비고</th></tr></thead><tbody>`;
                q.lodTable.forEach(row => html += `<tr><td>${row.standard}</td><td>${row.levels.join(', ')}</td><td>${row.note}</td></tr>`);
                html += `</tbody></table>`;
            }
            if (q.requiredDocuments) {
                html += `<table class="uis-table"><thead><tr><th>구분</th><th>항목</th><th>세부내용</th></tr></thead><tbody>`;
                q.requiredDocuments.forEach(doc => html += `<tr><td>${doc.classification}</td><td>${doc.item}</td><td>${doc.details}</td></tr>`);
                html += `</tbody></table>`;
            }
            if (q.folderStructureExample) {
                html += `<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; font-family: monospace;">`;
                html += `<strong>📂 ${q.folderStructureExample.root}</strong><ul style="list-style: none; padding-left: 20px; margin-top: 5px;">`;
                q.folderStructureExample.folders.forEach(f => html += `<li>└ ${f}</li>`);
                html += `</ul></div>`;
            }
            if (q.mappingTable) {
                html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">`;
                q.mappingTable.forEach(m => html += `<div style="border: 1px solid #ddd; padding: 8px; border-radius: 4px; font-size: 0.9em;"><strong>${m.layer}</strong>: ${m.abbr}</div>`);
                html += `</div>`;
            }
            if (q.accuracyTable) {
                html += `<table class="uis-table"><thead><tr><th>축척</th><th>GSD</th><th>수평위치오차</th></tr></thead><tbody>`;
                q.accuracyTable.forEach(row => html += `<tr><td>${row.scale}</td><td>${row.gsd}</td><td>${row.rmse}</td></tr>`);
                html += `</tbody></table>`;
            }
            if (q.lidarGridSpecs) {
                html += `<table class="uis-table"><thead><tr><th>격자간격</th><th>정확도(RMSE)</th><th>최대오차</th></tr></thead><tbody>`;
                q.lidarGridSpecs.forEach(row => {
                    if(row.note) html += `<tr><td>${row.gridSize}</td><td colspan="2">${row.note}</td></tr>`;
                    else html += `<tr><td>${row.gridSize}</td><td>${row.rmse}</td><td>${row.maxError}</td></tr>`;
                });
                html += `</tbody></table>`;
            }
            if (q.fileStructure) {
                html += `<div style="overflow-x: auto; margin-top: 10px;"><table class="uis-table" style="min-width: 600px;"><thead><tr><th>구분</th><th>폴더명</th><th>포맷</th><th>설명</th></tr></thead><tbody>`;
                q.fileStructure.forEach(f => html += `<tr><td>${f.category}</td><td>${f.subFolder}</td><td>${f.format}</td><td>${f.desc}</td></tr>`);
                html += `</tbody></table></div>`;
            }

            html += `</div>`;
        });
        
        html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderRegulationRevision() {
    const container = document.getElementById('regulationRevisionContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = REGULATION_REVISION_DATA;
    
    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    
    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;">
                <h2 style="margin-bottom:10px;">${data.documentTitle}</h2>
                <h4 style="color:#555;">${data.subHeader}</h4>
             </div>`;

    // Description
    html += `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="margin-bottom: 10px; color: #007bff;">주요 개정 내용</h3>
                <p style="line-height: 1.7;">${data.description}</p>
             </div>`;

    // Comparison Table
    html += `<h3 style="border-left: 5px solid #28a745; padding-left: 10px; margin-bottom: 15px;">개정 전-후 비교</h3>`;
    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">`;
    
    data.revisionComparison.forEach(phase => {
        const isBefore = phase.phase === '개정 전';
        const headerBg = isBefore ? '#ffebee' : '#e8f5e9';
        const headerColor = isBefore ? '#c62828' : '#2e7d32';
        
        html += `<div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="background-color: ${headerBg}; color: ${headerColor}; padding: 15px; font-weight: bold; font-size: 1.1em; text-align: center;">${phase.phase} <span style="font-size: 0.9em; opacity: 0.8;">(${phase.phaseEnglish})</span></div>
                    <ul style="padding: 20px 20px 20px 40px; margin: 0; background: #fff;">`;
        phase.details.forEach(detail => html += `<li style="margin-bottom: 10px;">${detail}</li>`);
        html += `</ul></div>`;
    });
    html += `</div>`;

    // Footer Note
    html += `<div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #eee; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                <p style="margin-bottom: 10px;">${data.footerNote}</p>
                <a href="${data.referenceUrl}" target="_blank" class="btn btn-info btn-sm">국토정보플랫폼</a>
             </div>`;

    html += `</div>`;
    container.innerHTML = html;
}

function renderMaterialAbbr() {
    const container = document.getElementById('materialAbbrContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = MATERIAL_ABBREVIATION_DATA;

    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;

    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;">
                <h2 style="margin-bottom:10px;">${data.documentTitle}</h2>
             </div>`;

    // Tables
    data.tables.forEach(table => {
        html += `<h3 style="border-left: 5px solid #ffc107; padding-left: 10px; margin-bottom: 15px; margin-top: 30px;">${table.tableName}</h3>`;
        
        if (table.data && table.data.length > 0) {
            const headers = Object.keys(table.data[0]);
            const headerTitles = {
                category: '구분',
                symbol: '기호',
                unit: '단위',
                abbreviation: '약어',
                originalTerm: '원어',
                description: '설명',
                relatedUndergroundFacilities: '관련 지하시설물'
            };

            html += `<div style="overflow-x: auto;"><table class="uis-table" style="min-width: 800px;"><thead><tr>`;
            headers.forEach(header => {
                html += `<th>${headerTitles[header] || header}</th>`;
            });
            html += `</tr></thead><tbody>`;

            table.data.forEach(row => {
                html += `<tr>`;
                headers.forEach(header => {
                    html += `<td>${row[header]}</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table></div>`;
        }
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderPublicSurveyRegulations() {
    const container = document.getElementById('publicSurveyRegContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = PUBLIC_SURVEY_REGULATIONS_DATA;

    let html = `<div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;

    // Header
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;">
                <h2 style="margin-bottom:10px;">${data.documentTitle}</h2>
             </div>`;

    data.parts.forEach(part => {
        html += `<div style="margin-top: 40px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fdfdff;">`;
        html += `<h3 style="border-left: 5px solid #8e44ad; padding-left: 10px; margin-bottom: 20px;">${part.partTitle}</h3>`;
        
        part.articles.forEach(article => {
            html += `<div style="margin-bottom: 20px; padding-left: 10px;">`;
            html += `<h4 style="color: #2980b9; margin-bottom: 10px;">${article.articleId} ${article.title || ''}</h4>`;

            const renderContent = (content) => {
                if (!content) return;
                if (Array.isArray(content)) {
                    content.forEach(item => {
                        if (typeof item === 'string') {
                            html += `<p style="line-height: 1.7; margin-bottom: 5px;">${item}</p>`;
                        } else if (typeof item === 'object' && item !== null) {
                            if (item.term && item.definition) {
                                html += `<p style="margin-left: 20px; line-height: 1.7;"><strong>${item.term}:</strong> ${item.definition}</p>`;
                                if (item.subItems) {
                                    html += `<ul style="margin-left: 40px; list-style-type: lower-alpha; margin-top: 5px;">`;
                                    item.subItems.forEach(sub => html += `<li style="margin-bottom: 3px;">${sub}</li>`);
                                    html += `</ul>`;
                                }
                            } else if (item.table) {
                                html += `<div style="overflow-x: auto; margin-top: 15px;"><table class="uis-table">`;
                                html += `<caption>${item.table.title}</caption>`;
                                html += `<thead><tr>`;
                                item.table.columns.forEach(col => html += `<th>${col}</th>`);
                                html += `</tr></thead><tbody>`;
                                item.table.data.forEach(row => {
                                    html += `<tr>`;
                                    item.table.columns.forEach(colKey => html += `<td>${row[colKey] || ''}</td>`);
                                    html += `</tr>`;
                                });
                                html += `</tbody></table></div>`;
                            } else if (item.type === 'sublist-alpha' && item.items) {
                                html += `<ul style="margin-left: 20px; list-style-type: lower-alpha; margin-top: 5px;">`;
                                item.items.forEach(sub => html += `<li style="margin-bottom: 3px;">${sub}</li>`);
                                html += `</ul>`;
                            } else if (item.type === 'color-codes' && item.items) {
                                html += `<ul style="margin-left: 20px; list-style-type: none; padding-left: 0; margin-top: 5px;">`;
                                item.items.forEach(sub => html += `<li style="margin-bottom: 3px;"><strong>${sub.facility}:</strong> ${sub.color}</li>`);
                                html += `</ul>`;
                            } else if (item.content) {
                                html += `<p style="line-height: 1.7;">${item.index ? `${item.index}. ` : ''}${item.content}</p>`;
                            }
                        }
                    });
                } else if (typeof content === 'string') {
                    html += `<p style="line-height: 1.7;">${content}</p>`;
                }
            };

            if (article.intro) html += `<p><em>${article.intro}</em></p>`;
            renderContent(article.content || article.paragraphs || article.definitions);
            if (article.steps) {
                html += `<ol style="margin-left: 20px; margin-top: 10px;">`;
                article.steps.forEach(step => html += `<li style="line-height: 1.7; margin-bottom: 5px;">${step}</li>`);
                html += `</ol>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// --- CAD Viewer Logic ---
let cadMap = null;
let cadProtocol = null;
let cadLayers = new Set();
let cadLayerColors = {};
let cadHiddenLayers = new Set();

export async function initCadViewer() {
    const statusEl = document.getElementById('cadStatus');
    statusEl.innerText = '설정 로드 중...';
    try {
        if (!state.supabaseConfig) {
            const sbRes = await callApi('getSupabaseConfig');
            if (sbRes.success) state.supabaseConfig = { url: sbRes.url, key: sbRes.key };
        }
        if (R2_BASE_URL) {
            state.r2Config = { publicUrl: R2_BASE_URL };
        } else {
            const r2Res = await callApi('getR2Config');
            if (r2Res.success) state.r2Config = { bucket: r2Res.R2_BUCKET_NAME, publicUrl: r2Res.R2_Public_Url || r2Res.R2_Endpoints };
        }
        if (!cadProtocol && typeof pmtiles !== 'undefined') {
            cadProtocol = new pmtiles.Protocol();
            maplibregl.addProtocol("pmtiles", cadProtocol.tile);
        }
        await loadCadProjects();
        statusEl.innerText = '프로젝트를 선택해주세요.';
        cadLayers.clear(); cadLayerColors = {};
        document.getElementById('cadLayerPanel').style.display = 'none';
        const toggleBtn = document.getElementById('cadLayerToggleBtn');
        if (toggleBtn) toggleBtn.style.display = 'none';
    } catch (e) { console.error(e); statusEl.innerText = '초기화 실패: ' + e.message; }
}

async function loadCadProjects() {
    const select = document.getElementById('cadProjectSelect');
    select.innerHTML = '<option value="">로딩 중...</option>';
    try {
        const data = await callSupabaseDirect('cad_projects?select=id,name,created_at&order=created_at.desc');
        select.innerHTML = '<option value="">프로젝트를 선택하세요</option>';
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.name} (${new Date(p.created_at).toLocaleDateString()})`;
            select.appendChild(opt);
        });
    } catch (e) { select.innerHTML = '<option value="">목록 로드 실패</option>'; showAlert('CAD 프로젝트 목록 로드 실패: ' + e.message, 'error'); }
}

export async function loadCadMap(projectId) {
    if (!projectId) return;
    const statusEl = document.getElementById('cadStatus');
    statusEl.innerText = '지도 데이터 로딩 중...';
    if (cadMap) { cadMap.remove(); cadMap = null; }
    cadLayers.clear(); cadLayerColors = {}; cadHiddenLayers.clear();
    document.getElementById('cadLayerList').innerHTML = '';
    document.getElementById('cadLayerPanel').style.display = 'none';

    try {
        const files = await callSupabaseDirect(`cad_files?project_id=eq.${projectId}&file_type=eq.pmtiles&limit=1`);
        if (!files || files.length === 0) { statusEl.innerText = '이 프로젝트에는 변환된 PMTiles 파일이 없습니다.'; return; }
        const filePath = files[0].file_path;
        const baseUrl = state.r2Config.publicUrl.replace(/\/$/, '');
        const fileUrl = `${baseUrl}/${filePath}`;
        const pmtilesUrl = `pmtiles://${fileUrl}`;
        const p = new pmtiles.PMTiles(fileUrl);
        let bounds = [[124, 33], [132, 43]];
        let maxDataZoom = 24;
        try {
            const header = await p.getHeader();
            if (header) { bounds = [header.minLon, header.minLat, header.maxLon, header.maxLat]; maxDataZoom = header.maxZoom || 24; }
            const metadata = await p.getMetadata();
            if (metadata && metadata.vector_layers) {
                metadata.vector_layers.forEach(l => { cadLayers.add(l.id); if (!cadLayerColors[l.id]) cadLayerColors[l.id] = getRandomColor(); });
                renderLayerList();
                document.getElementById('cadLayerToggleBtn').style.display = 'block';
            }
        } catch (e) { console.warn("PMTiles Metadata Warning:", e); }

        cadMap = new maplibregl.Map({
            container: 'cad-map', fadeDuration: 0, bounds: bounds, fitBoundsOptions: { padding: 40, animate: false },
            renderWorldCopies: false, maxZoom: 24, localIdeographFontFamily: "'Noto Sans KR', sans-serif",
            validateStyle: false, boxZoom: false, dragRotate: false, doubleClickZoom: false,
            style: {
                version: 8, glyphs: "https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf",
                sources: {
                    'cad_source': { type: 'vector', url: pmtilesUrl, attribution: '© AsinTech Map Viewer', maxzoom: maxDataZoom },
                    'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap', maxzoom: 19 }
                },
                layers: [
                    // [수정] 배경지도 투명도를 1.0으로 변경하여 전체화면 시 어두워지는 현상 해결
                    { id: 'background-layer', type: 'raster', source: 'osm', paint: { 'raster-opacity': 1.0 } },
                    { id: 'cad-lines', source: 'cad_source', 'source-layer': 'line', type: 'line', paint: { 'line-color': '#555555', 'line-width': 1.5 } },
                    { id: 'cad-points', source: 'cad_source', 'source-layer': 'point', type: 'circle', paint: { 'circle-color': '#FF0000', 'circle-radius': 3, 'circle-stroke-width': 1, 'circle-stroke-color': '#333333' } },
                    { id: 'cad-text', type: 'symbol', source: 'cad_source', 'source-layer': 'point', filter: ['has', 'text'], layout: { 'text-field': ['get', 'text'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'bottom-left', 'text-offset': [0, 0], 'text-font': ['Open Sans Regular'], 'text-rotate': ['get', 'rotation'], 'text-rotation-alignment': 'map' }, paint: { 'text-color': '#000000' } }
                ]
            }
        });
        cadMap.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), 'top-right');
        cadMap.addControl(new maplibregl.FullscreenControl(), 'top-right');
        cadMap.addControl(new maplibregl.NavigationControl(), 'top-right');
        cadMap.on('load', () => { 
            updateMapStyle(); 
            updateMapFilter(); 
            
            // [추가] 초기 UI 상태 반영 (체크박스 상태 동기화)
            const chkMap = document.getElementById('chkMap');
            if (chkMap) toggleBackgroundMap(chkMap.checked);
            
            const chkMarkers = document.getElementById('chkMarkers');
            if (chkMarkers) toggleMarkers(chkMarkers.checked);

            statusEl.innerText = '도면 로드 완료'; 
        });
        cadMap.on('idle', updateLayerDiscovery);
    } catch (e) { console.error(e); statusEl.innerText = '지도 로드 오류: ' + e.message; }
}

// [추가] 배경지도 토글 기능
export function toggleBackgroundMap(isVisible) {
    if (!cadMap || !cadMap.getLayer('background-layer')) return;
    cadMap.setLayoutProperty('background-layer', 'visibility', isVisible ? 'visible' : 'none');
    updateCadStyle();
}

// [추가] 마커 토글 및 텍스트 위치 조정 기능
export function toggleMarkers(isVisible) {
    if (!cadMap) return;
    
    // 1. 마커(Point) 레이어 토글
    if (cadMap.getLayer('cad-points')) {
        cadMap.setLayoutProperty('cad-points', 'visibility', isVisible ? 'visible' : 'none');
    }
}

/**
 * 배경지도 유무와 전체화면 상태에 따른 스타일 업데이트
 */
function updateCadStyle() {
    if (!cadMap) return;

    const bgLayer = cadMap.getLayer('background-layer');
    const isBgVisible = bgLayer && cadMap.getLayoutProperty('background-layer', 'visibility') !== 'none';

    const canvasContainer = cadMap.getCanvasContainer();
    const mapContainer = cadMap.getContainer();
    let textColor = '#000000'; // 텍스트는 항상 검정색 유지
    // 배경지도가 보이면 투명(지도보임), 안 보이면 흰색 배경
    let bgColor = isBgVisible ? '' : '#ffffff';

    canvasContainer.style.backgroundColor = bgColor;
    mapContainer.style.backgroundColor = bgColor;

    if (cadMap.getLayer('cad-text')) {
        cadMap.setPaintProperty('cad-text', 'text-color', textColor);
    }
}

function updateLayerDiscovery() {
    if (!cadMap) return;
    const features = cadMap.queryRenderedFeatures({ layers: ['cad-lines', 'cad-points'] });
    let updated = false;
    features.forEach(f => {
        const layerName = f.properties.layer;
        if (layerName && !cadLayers.has(layerName)) {
            cadLayers.add(layerName);
            if (!cadLayerColors[layerName]) cadLayerColors[layerName] = getRandomColor();
            updated = true;
        }
    });
    if (updated) { renderLayerList(); updateMapStyle(); updateMapFilter(); }
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 180); const g = Math.floor(Math.random() * 180); const b = Math.floor(Math.random() * 180);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function renderLayerList() {
    const listEl = document.getElementById('cadLayerList'); listEl.innerHTML = '';
    
    // [추가] 전체 레이어 색상 변경 컨트롤
    const globalDiv = document.createElement('div');
    globalDiv.className = 'layer-item';
    globalDiv.style.cssText = 'border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; font-weight: bold; display: flex; align-items: center; justify-content: space-between;';
    globalDiv.innerHTML = `<span>전체 색상 변경</span> <input type="color" class="layer-color-picker" onchange="window.changeAllLayerColors(this.value)" title="모든 레이어 색상 변경">`;
    listEl.appendChild(globalDiv);

    Array.from(cadLayers).sort().forEach(layer => {
        const color = cadLayerColors[layer]; const isChecked = !cadHiddenLayers.has(layer);
        const div = document.createElement('div'); div.className = 'layer-item';
        div.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleLayer('${layer}', this.checked)"> <input type="color" class="layer-color-picker" value="${color}" onchange="window.changeLayerColor('${layer}', this.value)"> <span class="layer-name" title="${layer}">${layer}</span>`;
        listEl.appendChild(div);
    });
}

export function toggleLayer(layerName, isVisible) { if (isVisible) cadHiddenLayers.delete(layerName); else cadHiddenLayers.add(layerName); updateMapFilter(); }
export function changeLayerColor(layerName, newColor) { cadLayerColors[layerName] = newColor; updateMapStyle(); }
// [추가] 전체 레이어 색상 일괄 변경 함수
export function changeAllLayerColors(newColor) {
    for (const layer of cadLayers) {
        cadLayerColors[layer] = newColor;
    }
    updateMapStyle();
    renderLayerList(); // 개별 색상 선택기들도 업데이트된 색상으로 다시 렌더링
}
export function toggleLayerPanel() { const panel = document.getElementById('cadLayerPanel'); panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none'; }

function updateMapFilter() {
    if (!cadMap) return;
    if (cadHiddenLayers.size === 0) {
        if (cadMap.getLayer('cad-lines')) cadMap.setFilter('cad-lines', null);
        if (cadMap.getLayer('cad-points')) cadMap.setFilter('cad-points', null);
        if (cadMap.getLayer('cad-text')) cadMap.setFilter('cad-text', ['has', 'text']);
        return;
    }
    const filterExpr = ['!in', 'layer', ...Array.from(cadHiddenLayers)];
    if (cadMap.getLayer('cad-lines')) cadMap.setFilter('cad-lines', filterExpr);
    if (cadMap.getLayer('cad-points')) cadMap.setFilter('cad-points', filterExpr);
    if (cadMap.getLayer('cad-text')) cadMap.setFilter('cad-text', ['all', ['has', 'text'], filterExpr]);
}

function updateMapStyle() {
    if (!cadMap) return;
    const matchExpr = ['match', ['get', 'layer']];
    for (const [layer, color] of Object.entries(cadLayerColors)) matchExpr.push(layer, color);
    matchExpr.push('#cccccc');
    
    if (cadMap.getLayer('cad-lines')) cadMap.setPaintProperty('cad-lines', 'line-color', matchExpr);
    if (cadMap.getLayer('cad-points')) cadMap.setPaintProperty('cad-points', 'circle-color', matchExpr);
}

export function cleanupCadViewer() {
    if (cadMap) { cadMap.remove(); cadMap = null; }
    state.r2Config = null; cadLayers.clear(); cadLayerColors = {}; cadHiddenLayers.clear();
    document.getElementById('cadLayerPanel').style.display = 'none';
    document.getElementById('cadLayerToggleBtn').style.display = 'none';
}

// 전체화면 상태 변경 감지 리스너
document.addEventListener('fullscreenchange', () => {
    updateCadStyle();
});
