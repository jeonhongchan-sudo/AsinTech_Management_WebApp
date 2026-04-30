// e:\Program\SelfProgram\아신테크\js\viewers.js
import { state, callApi, callSupabaseDirect, showAlert, R2_BASE_URL } from './core.js';
import { UIS_DATA, ROAD_LEDGER_ITEMS, PDF_TOC_DATA, NETWORK_RTK_DATA, NON_CONFORMITY_CASES_DATA, NUMERIC_MAP_DATA, GNSS_NOTICE_DATA, PUBLIC_SURVEY_FAQ_DATA, REGULATION_REVISION_DATA, MATERIAL_ABBREVIATION_DATA, PUBLIC_SURVEY_REGULATIONS_DATA } from './data.js';

export function selectGuideline(type) {
    document.querySelectorAll('.guide-menu-item').forEach(b => b.classList.remove('active'));
    document.getElementById('menu-guide-' + type)?.classList.add('active');

    const titleEl = document.getElementById('currentPdfTitle');
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
    
    if (type === 'uis') {
        titleEl.innerText = 'UIS 시설물 측량 코드표';
        uisContainer.style.display = 'block';
        renderUISTable();
    } else if (type === 'rtk') {
        titleEl.innerText = NETWORK_RTK_DATA.title;
        if(rtkContainer) {
            rtkContainer.style.display = 'block';
            renderNetworkRtk();
        }
    } else if (type === 'nonConformity') {
        titleEl.innerText = NON_CONFORMITY_CASES_DATA.title;
        if(ncContainer) {
            ncContainer.style.display = 'block';
            renderNonConformityCases();
        }
    } else if (type === 'road') {
        titleEl.innerText = '2024 도로대장 작성 지침';
        if(roadContainer) {
            roadContainer.style.display = 'block';
            renderRoadLedgerTOC();
        }
    } else if (type === 'numericMap') {
        titleEl.innerText = NUMERIC_MAP_DATA.title;
        if(numericContainer) {
            numericContainer.style.display = 'block';
            renderNumericMap();
        }
    } else if (type === 'gnssNotice') {
        titleEl.innerText = GNSS_NOTICE_DATA.title;
        if(gnssContainer) {
            gnssContainer.style.display = 'block';
            renderGnssNotice();
        }
    } else if (type === 'faq') {
        titleEl.innerText = PUBLIC_SURVEY_FAQ_DATA.title;
        if(faqContainer) {
            faqContainer.style.display = 'block';
            renderPublicSurveyFaq();
        }
    } else if (type === 'regulationRevision') {
        titleEl.innerText = REGULATION_REVISION_DATA.documentTitle;
        if(revisionContainer) {
            revisionContainer.style.display = 'block';
            renderRegulationRevision();
        }
    } else if (type === 'materialAbbr') {
        titleEl.innerText = MATERIAL_ABBREVIATION_DATA.documentTitle;
        if(materialContainer) {
            materialContainer.style.display = 'block';
            renderMaterialAbbr();
        }
    } else if (type === 'publicSurveyReg') {
        titleEl.innerText = PUBLIC_SURVEY_REGULATIONS_DATA.documentTitle;
        if(publicSurveyRegContainer) {
            publicSurveyRegContainer.style.display = 'block';
            renderPublicSurveyRegulations();
        }
    }
}

export function toggleFullScreen() {
    const mapContainer = document.getElementById('cad-map');

    let elementToFullscreen = null;
    if (document.getElementById('cadViewer-tab')?.classList.contains('active')) {
        elementToFullscreen = mapContainer;
    }

    if (!elementToFullscreen) return;

    if (!document.fullscreenElement) {
        elementToFullscreen.requestFullscreen().catch(err => console.error(`전체화면 오류: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}

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
        const realPage = item.page + 14; // PAGE_OFFSET
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
let memoMarkers = []; // [추가] 메모 마커 관리용 배열
let currentPopup = null; // [추가] 현재 열린 팝업 추적용

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
        // [수정] cad_projects의 생성일과 연관된 cad_files의 updated_at을 함께 조회
        // cad_projects 테이블에 updated_at이 없을 수 있으므로 cad_files 테이블을 참조
        const data = await callSupabaseDirect('cad_projects?select=id,name,created_at,cad_files(updated_at)');
        
        // [추가] 각 프로젝트별로 파일들의 최종 업데이트 날짜를 비교하여 최신 날짜 산출
        const projects = data.map(p => {
            let lastDate = new Date(p.created_at); // 기본값: 프로젝트 생성일
            if (p.cad_files && Array.isArray(p.cad_files)) {
                p.cad_files.forEach(f => {
                    if (f.updated_at) {
                        const fDate = new Date(f.updated_at);
                        if (fDate > lastDate) lastDate = fDate;
                    }
                });
            }
            return { ...p, finalDate: lastDate };
        });

        // [추가] 계산된 최종 날짜(최신순)로 정렬
        projects.sort((a, b) => b.finalDate - a.finalDate);

        select.innerHTML = '<option value="">프로젝트를 선택하세요</option>';
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            // [수정] 프로젝트 이름과 최종 업데이트 날짜 표시
            opt.innerText = `${p.name} (${p.finalDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })})`;
            select.appendChild(opt);
        });
    } catch (e) { select.innerHTML = '<option value="">목록 로드 실패</option>'; showAlert('CAD 프로젝트 목록 로드 실패: ' + e.message, 'error'); }
}

export async function loadCadMap(projectId) {
    if (!projectId) return;
    state.currentCadProjectId = projectId; // [수정] 전역 상태에 프로젝트 ID 저장
    const statusEl = document.getElementById('cadStatus');
    statusEl.innerText = '지도 데이터 로딩 중...';
    if (cadMap) { cadMap.remove(); cadMap = null; }
    cadLayers.clear(); cadLayerColors = {}; cadHiddenLayers.clear();
    document.getElementById('cadLayerList').innerHTML = '';
    document.getElementById('cadLayerPanel').style.display = 'none';

    try {
        const files = await callSupabaseDirect(`cad_files?project_id=eq.${projectId}&file_type=eq.pmtiles&select=*,source_crs&limit=1`);
        if (!files || files.length === 0) { statusEl.innerText = '이 프로젝트에는 변환된 PMTiles 파일이 없습니다.'; return; }
        
        const fileData = files[0];
        state.currentProjectSourceCrs = fileData.source_crs || 'EPSG:5179';
        const filePath = fileData.file_path;
        // [수정] 캐시 무시를 위한 버전 쿼리 스트링 추가 (updated_at 시간값 사용)
        const version = fileData.updated_at ? new Date(fileData.updated_at).getTime() : Date.now();
        
        const baseUrl = state.r2Config.publicUrl.replace(/\/$/, '');
        const fileUrl = `${baseUrl}/${filePath}?v=${version}`;
        const pmtilesUrl = `pmtiles://${fileUrl}`;
        const p = new pmtiles.PMTiles(fileUrl);
        let bounds = [[124, 33], [132, 43]];
        let maxDataZoom = 24;
        const labelStyleKey = `${projectId}__LINE_LABEL_STYLE__`;
        const savedLabelStyle = state.userSettings?.layer_styles?.[labelStyleKey] || { size: 12, color: '#000000' };
        try {
            const header = await p.getHeader();
            if (header) { bounds = [header.minLon, header.minLat, header.maxLon, header.maxLat]; maxDataZoom = header.maxZoom || 24; }
            const metadata = await p.getMetadata();
            if (metadata && metadata.vector_layers) {
                // 소스 레이어 ID(line, point 등)를 직접 추가하지 않고 Discovery 기능을 통해 실제 속성 레이어명을 찾습니다.
                renderLayerList();
                document.getElementById('cadLayerToggleBtn').style.display = 'block';
            }
        } catch (e) { console.warn("PMTiles Metadata Warning:", e); }

        cadMap = new maplibregl.Map({
            container: 'cad-map', fadeDuration: 0, bounds: bounds, fitBoundsOptions: { padding: 40, animate: false },
            renderWorldCopies: false, maxZoom: 24, localIdeographFontFamily: "'Noto Sans KR', sans-serif",
            validateStyle: false, boxZoom: false, dragRotate: false, doubleClickZoom: false,
            style: {
                version: 8, glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
                sources: {
                    'cad_source': { type: 'vector', url: pmtilesUrl, attribution: '© AsinTech Map Viewer', maxzoom: maxDataZoom },
                    'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap', maxzoom: 19 }
                },
                layers: [
                    // [수정] 배경지도 투명도를 1.0으로 변경하여 전체화면 시 어두워지는 현상 해결
                    { id: 'background-layer', type: 'raster', source: 'osm', paint: { 'raster-opacity': 1.0 } },
                    // [추가] 폭이 있는 폴리라인을 변환한 Polygon 레이어
                    { 
                        id: 'cad-polygons',
                        source: 'cad_source', 
                        'source-layer': 'polygon', // tippecanoe에서 지정한 레이어 이름
                        type: 'fill', 
                        paint: { 'fill-color': '#888888', 'fill-opacity': 1 } 
                    },
                    // [복원] 단일 라인 레이어로 통합 (누락 방지)
                    { id: 'cad-lines', source: 'cad_source', 'source-layer': 'line', type: 'line', paint: { 'line-color': '#555555', 'line-width': 1.5 } },
                    
                    { id: 'cad-points', source: 'cad_source', 'source-layer': 'point', type: 'circle', paint: { 'circle-color': '#FF0000', 'circle-radius': 3, 'circle-stroke-width': 1, 'circle-stroke-color': '#333333' } },
                    { id: 'cad-text', type: 'symbol', source: 'cad_source', 'source-layer': 'point', filter: ['has', 'text'], layout: { 'text-field': ['get', 'text'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'bottom-left', 'text-offset': [0, 0], 'text-font': ['Open Sans Regular'], 'text-rotate': ['get', 'rotation'], 'text-rotation-alignment': 'map' }, paint: { 'text-color': '#000000' } },
                    { id: 'cad-line-labels', type: 'symbol', source: 'cad_source', 'source-layer': 'line', layout: { 'symbol-placement': 'line', 'text-field': ['get', 'layer'], 'text-size': savedLabelStyle.size || 12, 'text-rotation-alignment': 'map', 'text-anchor': 'center', 'text-justify': 'center', 'text-font': ['Open Sans Regular'], 'text-offset': [0, -1], 'text-allow-overlap': false, 'text-writing-mode': ['vertical'] }, paint: { 'text-color': savedLabelStyle.color || '#000000' } }
                ]
            },
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

            const chkLineLabels = document.getElementById('chkLineLabels');
            if (chkLineLabels) toggleLineLabels(chkLineLabels.checked);

            statusEl.innerText = '도면 로드 완료'; 
            
            // [추가] 메모 데이터 로드 (지도 표시용)
            loadMapMemos();
        });
        cadMap.on('idle', updateLayerDiscovery); // 지도가 멈췄을 때 실제 레이어 명칭 감지 실행
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

// [추가] 선 레이어 명 토글 기능
export function toggleLineLabels(isVisible) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels')) return;
    cadMap.setLayoutProperty('cad-line-labels', 'visibility', isVisible ? 'visible' : 'none');
}

// [추가] 전역 함수 등록 (HTML에서 호출 가능하도록)
window.toggleLineLabels = toggleLineLabels;

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

// [복구 및 수정] 실제 캐드 레이어명을 감지하는 함수
function updateLayerDiscovery() {
    if (!cadMap) return;
    // 화면에 렌더링된 피처들 중 선, 점, 폴리곤 레이어에서 속성 추출
    const features = cadMap.queryRenderedFeatures({ layers: ['cad-lines', 'cad-points', 'cad-polygons'] });
    let updated = false;

    features.forEach(f => {
        const layerName = f.properties.layer; // 실제 캐드 레이어명 (예: '도로중심선')
        
        // 레이어명이 존재하고, 아직 목록에 없으며, 무의미한 소스 레이어명이 아닌 경우만 추가
        if (layerName && !cadLayers.has(layerName) && !['line', 'point', 'polygon'].includes(layerName)) {
            cadLayers.add(layerName);
            
            const storageKey = `${state.currentCadProjectId}_${layerName}`;
            const savedStyle = state.userSettings?.layer_styles?.[storageKey];

            if (savedStyle) {
                cadLayerColors[layerName] = savedStyle.color || getRandomColor();
                if (savedStyle.visible === false) cadHiddenLayers.add(layerName);
                if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
                state.userSettings.layer_styles[storageKey].width = savedStyle.width || 1.5;
            } else {
                cadLayerColors[layerName] = getRandomColor();
            }
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
    globalDiv.innerHTML = `
        <span style="flex:1;">전체 스타일 변경</span>
        <input type="number" class="layer-width-input" value="1.5" min="0.1" max="20" step="0.5" onchange="window.changeAllLayerWidths(parseFloat(this.value))" title="모든 레이어 굵기 변경" style="margin-right:5px;">
        <input type="color" class="layer-color-picker" onchange="window.changeAllLayerColors(this.value)" title="모든 레이어 색상 변경">
    `;
    listEl.appendChild(globalDiv);

    // [추가] 선 레이어명 스타일 변경 컨트롤
    const labelStyleDiv = document.createElement('div');
    labelStyleDiv.className = 'layer-item';
    labelStyleDiv.style.cssText = 'border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; font-weight: bold; display: flex; align-items: center; justify-content: space-between;';
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    const savedLabelStyle = state.userSettings.layer_styles?.[labelStyleKey] || { size: 12, color: '#000000' };
    labelStyleDiv.innerHTML = `
        <span style="flex:1;">선레이어명 스타일</span>
        <input type="number" class="layer-width-input" value="${savedLabelStyle.size || 12}" min="1" max="50" step="1" onchange="window.changeLineLabelSize(parseInt(this.value))" title="글자 크기 변경" style="margin-right:5px;">
        <input type="color" class="layer-color-picker" value="${savedLabelStyle.color || '#000000'}" onchange="window.changeLineLabelColor(this.value)" title="글자 색상 변경">
    `;
    listEl.appendChild(labelStyleDiv);

    Array.from(cadLayers).sort().forEach(layer => {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const layerStyle = state.userSettings.layer_styles[storageKey] || {};
        const color = layerStyle.color || cadLayerColors[layer]; // cadLayerColors는 하위 호환용
        const isChecked = layerStyle.visible !== false; // visible이 false가 아니면 체크됨
        const lineWidth = layerStyle.width || 1.5; // 기본 굵기

        const div = document.createElement('div'); div.className = 'layer-item';
        
        // [수정] UI 간소화: 체크박스 | 색상 | 굵기 | 이름
        // [추가] 선 굵기 조절 input 추가
        div.innerHTML = `
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleLayer('${layer}', this.checked)" title="켜기/끄기">
            <input type="color" class="layer-color-picker" value="${color}" onchange="window.changeLayerColor('${layer}', this.value)" title="색상 변경">
            <span class="layer-name" title="${layer}" style="margin-left:5px;">${layer}</span>
        `;
        listEl.appendChild(div);
        
        // [추가] 선 레이어에만 굵기 조절 추가
        // PMTiles 내의 모든 레이어는 기본적으로 라인 레이어('cad-lines')로 렌더링되므로 굵기 조절창을 노출합니다.
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.className = 'layer-width-input';
        widthInput.value = lineWidth;
        widthInput.min = 0.1; widthInput.max = 20; widthInput.step = 0.5;
        widthInput.title = "선 굵기 조절";
        widthInput.onchange = (e) => window.changeLayerWidth(layer, parseFloat(e.target.value));
        
        // 색상 선택기와 레이어 이름 사이에 삽입
        div.insertBefore(widthInput, div.querySelector('.layer-name'));
    });
}

export function toggleLayer(layerName, isVisible) { 
    if (isVisible) cadHiddenLayers.delete(layerName); else cadHiddenLayers.add(layerName);
    updateMapFilter();
    saveUserStyles(layerName); // [추가] 상태 저장
}

export function changeLayerColor(layerName, newColor) { 
    const storageKey = `${state.currentCadProjectId}_${layerName}`;
    // state 객체 초기화 확인 및 즉시 반영
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
    state.userSettings.layer_styles[storageKey].color = newColor;

    cadLayerColors[layerName] = newColor; 
    updateMapStyle(); 
    saveUserStyles(layerName); // [수정] 통합 저장 함수 사용
}

// [추가] 선 굵기 변경 함수
export function changeLayerWidth(layerName, newWidth) {
    const storageKey = `${state.currentCadProjectId}_${layerName}`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
    state.userSettings.layer_styles[storageKey].width = newWidth;
    updateMapStyle();
    saveUserStyles(layerName);
}
// [추가] 전체 레이어 색상 일괄 변경 함수
export function changeAllLayerColors(newColor) {
    // [추가] 사용자 설정 객체 초기화 확인
    if (!state.userSettings) state.userSettings = {};
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};

    for (const layer of cadLayers) {
        cadLayerColors[layer] = newColor;
        
        // [수정] 메모리 상의 설정 업데이트 (저장용)
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const isVisible = !cadHiddenLayers.has(layer);
        
        state.userSettings.layer_styles[storageKey] = {
            color: newColor,
            visible: isVisible,
            width: state.userSettings.layer_styles[storageKey]?.width || 1.5 // 기존 굵기 유지
        };
    }
    updateMapStyle();
    renderLayerList(); // 개별 색상 선택기들도 업데이트된 색상으로 다시 렌더링
    saveUserStyles(); // [수정] 변경된 설정을 DB에 일괄 저장
}

// [추가] 전체 레이어 선 굵기 일괄 변경 함수
export function changeAllLayerWidths(newWidth) {
    if (!state.userSettings) state.userSettings = {};
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};

    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const isVisible = !cadHiddenLayers.has(layer);
        
        state.userSettings.layer_styles[storageKey] = {
            ...state.userSettings.layer_styles[storageKey],
            width: newWidth,
            visible: isVisible
        };
    }
    updateMapStyle();
    renderLayerList();
    saveUserStyles();
}

// [추가] 선 레이어명 글자 크기 변경 함수
export function changeLineLabelSize(newSize) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels') || !state.currentCadProjectId) return;
    cadMap.setLayoutProperty('cad-line-labels', 'text-size', newSize);
    
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    const style = state.userSettings.layer_styles[labelStyleKey] || { size: 12, color: '#000000' };
    style.size = newSize;
    state.userSettings.layer_styles[labelStyleKey] = style;
    saveUserStyles();
}

// [추가] 선 레이어명 글자 색상 변경 함수
export function changeLineLabelColor(newColor) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels') || !state.currentCadProjectId) return;
    cadMap.setPaintProperty('cad-line-labels', 'text-color', newColor);
    
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    const style = state.userSettings.layer_styles[labelStyleKey] || { size: 12, color: '#000000' };
    style.color = newColor;
    state.userSettings.layer_styles[labelStyleKey] = style;
    saveUserStyles();
}

// [수정] 지연 로드된 사용자 설정 적용 함수 (이름 변경 및 로직 확장)
export function reloadLayerStylesFromSettings() {
    if (!cadMap || !state.currentCadProjectId) return;
    let updated = false;
    cadLayers.forEach(layer => {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const savedStyle = state.userSettings?.layer_styles?.[storageKey];
        
        if (savedStyle) {
            if (savedStyle.color) cadLayerColors[layer] = savedStyle.color;
            if (savedStyle.visible === false) cadHiddenLayers.add(layer); else cadHiddenLayers.delete(layer);
            if (savedStyle.width) state.userSettings.layer_styles[`${state.currentCadProjectId}_${layer}`].width = savedStyle.width; // [추가] 굵기 로드
            updated = true; // [수정] width 로드 시에도 updated = true
        } else if (state.userSettings?.layer_colors?.[storageKey]) {
            // 하위 호환
            cadLayerColors[layer] = state.userSettings.layer_colors[storageKey];
            updated = true;
        }
    });
    // [추가] 프로젝트별 선 레이어명 스타일 적용
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    const savedLabelStyle = state.userSettings?.layer_styles?.[labelStyleKey];
    if (savedLabelStyle && cadMap.getLayer('cad-line-labels')) {
        if (savedLabelStyle.size) cadMap.setLayoutProperty('cad-line-labels', 'text-size', savedLabelStyle.size);
        if (savedLabelStyle.color) cadMap.setPaintProperty('cad-line-labels', 'text-color', savedLabelStyle.color);
    }
    if (updated) {
        updateMapStyle();
        updateMapFilter(); // 가시성 변경 반영
        renderLayerList();
    }
}

// [수정] 사용자 스타일 통합 저장 함수 (색상, 가시성, 대시)
async function saveUserStyles(layerName) {
    if (!state.currentUser || !state.supabaseConfig) return;
    
    if (layerName) {
        if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
        
        const storageKey = `${state.currentCadProjectId}_${layerName}`;
        
        // 현재 상태를 객체로 저장
        state.userSettings.layer_styles[storageKey] = {
            color: cadLayerColors[layerName], // cadLayerColors는 하위 호환용으로 유지
            width: state.userSettings.layer_styles[storageKey]?.width || 1.5, // [추가] 굵기 저장
            visible: !cadHiddenLayers.has(layerName)
        };
    }

    try {
        // Supabase Upsert (Insert or Update)
        await callSupabaseDirect('user_settings', 'POST', {
            username: state.currentUser,
            layer_styles: state.userSettings.layer_styles, // [추가] 스타일 컬럼 저장
            // layer_colors: state.userSettings.layer_colors // 레거시 유지를 원하면 주석 해제
        }, { 'Prefer': 'resolution=merge-duplicates' }, { keepalive: true }); // [수정] keepalive 추가
    } catch (e) {
        console.error("색상 저장 실패:", e);
    }
}

export function toggleLayerPanel() { const panel = document.getElementById('cadLayerPanel'); panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none'; }

function updateMapFilter() {
    if (!cadMap) return;

    // 레이어 목록에서 체크 해제된 레이어를 숨기기 위한 기본 필터
    const hiddenLayersArray = Array.from(cadHiddenLayers);
    const commonFilter = hiddenLayersArray.length > 0 ? ['!in', 'layer', ...hiddenLayersArray] : null;

    // 1. 라인, 폴리곤, 텍스트는 사용자의 가시성 설정(commonFilter)만 따름
    if (cadMap.getLayer('cad-lines')) cadMap.setFilter('cad-lines', commonFilter); // [수정] cad-lines 필터 적용
    if (cadMap.getLayer('cad-polygons')) cadMap.setFilter('cad-polygons', commonFilter); // [수정] cad-polygons 필터 적용

    if (cadMap.getLayer('cad-text')) {
        const textFilter = commonFilter ? ['all', ['has', 'text'], commonFilter] : ['has', 'text'];
        cadMap.setFilter('cad-text', textFilter);
    }

    // 2. 포인트(마커)는 사용자의 가시성 설정에 더해, 'Text_to_Pline' 레이어를 항상 제외
    // 2. 포인트(마커)는 사용자의 가시성 설정에 더해, 'Text_to_Pline' 레이어를 항상 제외
    const pointExclusionFilter = ['!=', 'layer', 'Text_to_Pline'];
    const finalPointFilter = commonFilter
        ? ['all', commonFilter, pointExclusionFilter]
        : pointExclusionFilter;

    if (cadMap.getLayer('cad-points')) cadMap.setFilter('cad-points', finalPointFilter);
}

function updateMapStyle() {
    if (!cadMap) return;

    // [수정] 레이어가 하나도 감지되지 않은 경우 match 표현식 생성 시 발생하는 오류 방지
    if (cadLayers.size === 0) {
        const defaultColor = '#cccccc';
        const defaultWidth = 1.5;
        if (cadMap.getLayer('cad-lines')) {
            cadMap.setPaintProperty('cad-lines', 'line-color', defaultColor);
            cadMap.setPaintProperty('cad-lines', 'line-width', defaultWidth);
        }
        if (cadMap.getLayer('cad-polygons')) cadMap.setPaintProperty('cad-polygons', 'fill-color', defaultColor);
        if (cadMap.getLayer('cad-points')) {
            cadMap.setPaintProperty('cad-points', 'circle-color', defaultColor);
            cadMap.setPaintProperty('cad-points', 'circle-radius', defaultWidth);
        }
        return;
    }

    const matchExpr = ['match', ['get', 'layer']];
    const widthMatchExpr = ['match', ['get', 'layer']]; // [추가] 굵기 매칭 표현식

    for (const layer of cadLayers) { // [수정] cadLayers를 순회하며 스타일 적용
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const layerStyle = state.userSettings.layer_styles[storageKey] || {};
        const color = layerStyle.color || cadLayerColors[layer] || '#cccccc'; // 기본 색상
        const width = layerStyle.width || 1.5; // 기본 굵기

        matchExpr.push(layer, color);
        widthMatchExpr.push(layer, width); // [추가] 굵기 매칭 표현식에 추가
    }
    matchExpr.push('#cccccc'); // 기본 색상 (매칭되지 않는 레이어)
    widthMatchExpr.push(1.5); // 기본 굵기 (매칭되지 않는 레이어)
    
    if (cadMap.getLayer('cad-lines')) cadMap.setPaintProperty('cad-lines', 'line-color', matchExpr); // [수정] 색상 적용
    if (cadMap.getLayer('cad-lines')) cadMap.setPaintProperty('cad-lines', 'line-width', widthMatchExpr); // [추가] 굵기 적용
    if (cadMap.getLayer('cad-polygons')) cadMap.setPaintProperty('cad-polygons', 'fill-color', matchExpr); // [수정] 색상 적용
    if (cadMap.getLayer('cad-points')) cadMap.setPaintProperty('cad-points', 'circle-color', matchExpr);
    if (cadMap.getLayer('cad-points')) cadMap.setPaintProperty('cad-points', 'circle-radius', widthMatchExpr); // [추가] 마커 크기를 선 굵기 설정과 동기화
}

export function cleanupCadViewer() {
    if (cadMap) { cadMap.remove(); cadMap = null; }
    state.r2Config = null; cadLayers.clear(); cadLayerColors = {}; cadHiddenLayers.clear();
    state.currentCadProjectId = null; // [추가] 초기화
    state.highlightedMemoId = null; // [추가] 강조 메모 초기화
    document.getElementById('cadLayerPanel').style.display = 'none';
    document.getElementById('cadLayerToggleBtn').style.display = 'none';
    state.projectPhotos = []; // [추가] 사진 목록 초기화
    // [추가] 메모 마커 초기화
    memoMarkers.forEach(m => m.remove());
    memoMarkers = [];
    currentPopup = null;
    clearDistanceMeasurement(); // [추가] 거리 측정 초기화
}

// 전체화면 상태 변경 감지 리스너
document.addEventListener('fullscreenchange', () => {
    updateCadStyle();
});

// --- [추가] 메모 기능 (Map Interaction) ---

// 메모 데이터 로드 (지도용)
export async function loadMapMemos() { // [수정] export 추가 및 마커 표시 로직 구현
    if (!state.currentCadProjectId || !state.supabaseConfig || !cadMap) return;
    
    // 기존 마커 제거
    memoMarkers.forEach(m => m.remove());
    memoMarkers = [];

    try {
        // [수정] 내 메모 또는(OR) 공개된 메모만 조회
        const user = state.currentUser ? encodeURIComponent(state.currentUser) : 'anonymous';
        
        // [추가] 조사 메모 필터링 적용
        let query = `memos?project_id=eq.${state.currentCadProjectId}&or=(is_public.eq.true,username.eq.${user})&select=*`;
        if (state.isSurveyFilterMode) {
            let filterPart = `&is_survey=eq.true`;
            if (state.selectedJobFilter) {
                filterPart += `&job_name=eq.${encodeURIComponent(state.selectedJobFilter)}`;
            }
            query = `memos?project_id=eq.${state.currentCadProjectId}&or=(is_public.eq.true,username.eq.${user})${filterPart}&select=*`;
        }
        const data = await callSupabaseDirect(query);
        state.memos = data || [];
        
        // [추가] 지도에 마커 표시
        state.memos.forEach(memo => {
            // 내 메모는 노란색, 타인 메모(공개)는 파란색 등으로 구분 가능
            const isMine = memo.username === state.currentUser;
            const isHighlighted = memo.id === state.highlightedMemoId; // [추가] 강조 여부 확인
            
            // [수정] 강조된 메모는 빨간색 및 크기 확대
            let color = isMine ? '#FFC107' : '#007bff'; 
            let scale = 0.8;
            if (isHighlighted) {
                color = '#dc3545'; // 빨간색 (강조)
                scale = 1.2;       // 크기 확대
            }

            const marker = new maplibregl.Marker({ color: color, scale: scale })
                .setLngLat([memo.lon, memo.lat]);

            // [수정] 마커 클릭 시 조회 팝업 대신 편집(작성) 팝업을 열도록 변경
            // 사용자가 "북마크를 눌러도 메모 작성 팝업 안으로 사진이 들어가게 해달라"고 요청함.
            marker.getElement().addEventListener('click', (e) => {
                e.stopPropagation(); // 지도 클릭 이벤트 전파 방지
                const feature = {
                    geometry: { coordinates: [memo.lon, memo.lat] },
                    properties: { layer: memo.layer || 'unknown' }
                };
                openMemoPopup(feature);
            });
            
            marker.addTo(cadMap);
            
            // [추가] 강조된 마커는 z-index를 높여서 맨 위로 표시
            if (isHighlighted) {
                marker.getElement().style.zIndex = '1000';
            }
            memoMarkers.push(marker);
        });
    } catch (e) {
        console.warn("메모 로드 실패 (테이블이 없을 수 있음):", e);
        state.memos = [];
    }
}

// [추가] 프로젝트의 전체 사진 목록 로드 (자동 매칭용)
async function loadProjectPhotos() {
    if (!state.currentCadProjectId || !state.supabaseConfig) return;
    try {
        // photos 테이블에서 파일명과 URL만 조회 (가볍게)
        const data = await callSupabaseDirect(`photos?cad_project_id=eq.${state.currentCadProjectId}&select=file_name,file_url`);
        state.projectPhotos = data || [];
        console.log(`[AutoMatch] Loaded ${state.projectPhotos.length} photos for matching.`);
    } catch (e) {
        console.warn("[AutoMatch] Failed to load photos:", e);
        state.projectPhotos = [];
    }
}

// [추가] 외부(메모 목록)에서 호출하여 해당 위치로 지도 이동
export function flyToLocation(lon, lat) {
    if (cadMap) {
        cadMap.flyTo({ center: [lon, lat], zoom: 18, essential: true });
    }
}

// 지도 클릭/터치 핸들러 등록
function setupMapInteraction() {
    if(!cadMap) return;
    cadMap.on('click', handleMapClick);
    // 터치 이벤트는 click으로 통합 처리됨 (MapLibre)
}

// 지도 클릭 핸들러 (스냅 기능 포함)
async function handleMapClick(e) {
    if (!state.currentCadProjectId) return;

    // [추가] 'Text_to_Pline' 레이어는 시각적으로만 표시하고 상호작용(클릭)은 막음
    const clickBbox = [[e.point.x - 2, e.point.y - 2], [e.point.x + 2, e.point.y + 2]];
    const featuresUnderClick = cadMap.queryRenderedFeatures(clickBbox, { layers: ['cad-lines', 'cad-text'] });
    const isNonInteractive = featuresUnderClick.some(f => f.properties.layer === 'Text_to_Pline');
    if (isNonInteractive) {
        if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
        }
        return; // 상호작용 중단
    }

    // 1. 스냅 (Snap) - 클릭 지점 주변의 포인트 피처 검색
    const snapRadius = 15; // 픽셀 단위 검색 반경
    const bbox = [
        [e.point.x - snapRadius, e.point.y - snapRadius],
        [e.point.x + snapRadius, e.point.y + snapRadius]
    ];
    
    const features = cadMap.queryRenderedFeatures(bbox, { layers: ['cad-points'] });
    let targetFeature = null;
    
    if (features.length > 0) {
        // 가장 가까운 피처 찾기
        let minDistance = Infinity;

        features.forEach(f => {
            const coords = f.geometry.coordinates; // [lon, lat]
            const p = cadMap.project(coords); // 화면 좌표로 변환
            const dist = Math.hypot(p.x - e.point.x, p.y - e.point.y);
            if (dist < minDistance) {
                minDistance = dist;
                targetFeature = f;
            }
        });
    }

    // [수정] 스냅된 포인트가 없으면 클릭한 위치 좌표 사용
    if (!targetFeature) {
        targetFeature = {
            geometry: { coordinates: [e.lngLat.lng, e.lngLat.lat] },
            properties: { layer: '사용자 지정' }
        };
    }

    // [추가] 거리 측정 모드일 경우 분기 처리
    if (state.isDistanceMode) {
        handleDistanceClick(targetFeature.geometry.coordinates);
        return;
    }

    openMemoPopup(targetFeature);
}

// 메모 팝업 열기
function openMemoPopup(feature) {
    // [추가] 이미 열린 팝업이 있다면 제거 (중복 방지)
    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }

    const coords = feature.geometry.coordinates; // [lon, lat]
    const lon = coords[0];
    const lat = coords[1];
    const layer = feature.properties.layer || 'unknown';
    
    // 기존 메모 찾기 (좌표 기준, 약간의 오차 허용)
    const existingMemo = state.memos.find(m => 
        Math.abs(m.lon - coords[0]) < 0.0000001 && 
        Math.abs(m.lat - coords[1]) < 0.0000001
    );

    const content = existingMemo ? existingMemo.content : '';
    const memoId = existingMemo ? existingMemo.id : null; // [추가] 수정 시 ID 전달
    const isPublic = existingMemo ? existingMemo.is_public : true; // [수정] 기본값: 공개 메모
    const isSurvey = existingMemo ? existingMemo.is_survey : false; // [추가] 기존 조사 여부
    const jobName = existingMemo ? existingMemo.job_name : ''; // [추가] 기존 Job 명
    let tmX = existingMemo ? existingMemo.tm_x : (feature.properties.tm_x || '');
    let tmY = existingMemo ? existingMemo.tm_y : (feature.properties.tm_y || '');
    const chainage = existingMemo ? existingMemo.chainage : (feature.properties.chainage || ''); // [추가] Chainage
    const existingImgUrls = existingMemo && existingMemo.image_url ? existingMemo.image_url.split(',') : [];
    
    // [수정] TM 좌표가 없는 경우(빈 공간 등) WGS84 -> 프로젝트 원본 좌표계로 변환
    if ((!tmX || !tmY) && typeof proj4 !== 'undefined') {
        try {
            const wgs84 = proj4('EPSG:4326');
            const targetCrs = proj4(state.currentProjectSourceCrs || 'EPSG:5179');
            const tmCoords = proj4(wgs84, targetCrs, [lon, lat]);
            if (tmCoords && !isNaN(tmCoords[0])) {
                tmX = tmCoords[0].toFixed(3);
                tmY = tmCoords[1].toFixed(3);
            }
        } catch (e) { console.warn("TM 변환 실패:", e); }
    }

    // -----------------------------------------------------------
    // [추가] 자동 사진 매칭 로직 (photo_linker_tool.py 참조)
    // -----------------------------------------------------------
    let matchedPhotosHtml = '';
    const pointText = (feature.properties.text || '').trim(); // PMTiles의 text 속성

    if (pointText && state.projectPhotos.length > 0) {
        const matched = state.projectPhotos.filter(p => {
            const fName = p.file_name || '';
            // 확장자 제거한 파일명 베이스
            const baseName = fName.includes('.') ? fName.substring(0, fName.lastIndexOf('.')) : fName;
            
            // 매칭 기준 (Python 스크립트 로직 이식)
            // 1. 완전 일치: point_name == file_name_base
            // 2. 부분 포함: file_name_base in point_name (파일명이 포인트명에 포함됨)
            // 3. 접두사: file_name_base.startswith(point_name + '-')
            return (pointText === baseName) || 
                   (pointText.includes(baseName)) || 
                   (baseName.startsWith(pointText + '-'));
        });

        if (matched.length > 0) {
            matchedPhotosHtml = `<div style="margin-bottom:8px; padding:5px; background:#f8f9fa; border-radius:4px; border:1px solid #eee;">
                <div style="font-size:11px; font-weight:bold; color:#007bff; margin-bottom:4px;">📸 관련 사진 (${matched.length})</div>
                <div style="display:flex; gap:4px; overflow-x:auto; padding-bottom:2px;">
                    ${matched.map(p => {
                        if (!p.file_url) return '';
                        const fullUrl = p.file_url;
                        return `<img src="${fullUrl}" onclick="window.open('${fullUrl}', '_blank')" style="width:40px; height:40px; object-fit:cover; border-radius:3px; cursor:pointer; border:1px solid #ddd;" title="${p.file_name}">`;
                    }).join('')}
                </div>
            </div>`;
        }
    }
    // -----------------------------------------------------------
    
    // [수정] 기존 이미지 여러 장 표시
    let existingImgHtml = '';
    if (existingImgUrls.length > 0) {
        existingImgHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px;">`;
        existingImgUrls.forEach(url => {
            if(!url.trim()) return;
            existingImgHtml += `<div class="existing-img-wrapper" style="position:relative; display:inline-block;"><img src="${url}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd; cursor:pointer;" onclick="window.open('${url}', '_blank')"><button onclick="window.removeExistingMemoImage('${url}', 'popupMemoPreview', 'popupMemoUrl')" style="position:absolute; top:-5px; right:-5px; background:#dc3545; color:white; border:1px solid white; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:12px; line-height:1; display:flex; align-items:center; justify-content:center;">&times;</button></div>`;
        });
        existingImgHtml += `</div>`;
    }
    
    // [추가] 좌표 및 체인리지 정보 표시 HTML 생성
    let infoHtml = '';
    const props = feature.properties || {};
    if (props.chainage) {
        infoHtml += `<div style="margin-top:10px; padding-top:8px; border-top:1px solid #eee; font-size:11px; color:#555; line-height:1.4;">`;
        infoHtml += `<div><strong>Chainage:</strong> ${props.chainage}</div>`;
        infoHtml += `</div>`;
    }

    // [수정] 외부 지도 앱 바로가기 링크
    // 카카오맵: 쉼표(,) 파싱 오류 방지를 위해 하이픈(-) 사용
    const kakaoDestName = encodeURIComponent(`${lat.toFixed(6)}-${lon.toFixed(6)}`);
    
    // T맵: 도착지 정보에 좌표를 명확히 표시하기 위해 쉼표(,) 사용
    const tmapDestName = encodeURIComponent(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);

    const mapLinksHtml = `<div id="map-links" style="margin-top:10px; padding-top:8px; border-top:1px solid #eee; display:flex; justify-content:space-around; gap:5px;">
        <a href="tmap://route?goalname=${tmapDestName}&goalx=${lon}&goaly=${lat}" target="_blank" class="btn btn-outline" style="flex:1; padding: 4px; font-size:11px;">T맵</a>
        <a href="https://map.kakao.com/link/map/${kakaoDestName},${lat},${lon}" target="_blank" class="btn btn-outline" style="flex:1; padding: 4px; font-size:11px; background-color:#FFEB00; color:#3C1E1E; border-color:#FFEB00;">카카오</a>
        <a href="https://m.map.naver.com/map.nhn?lat=${lat}&lng=${lon}&level=12&pin=1" target="_blank" class="btn btn-outline" style="flex:1; padding: 4px; font-size:11px; background-color:#03C75A; color:white; border-color:#03C75A;">네이버</a>
    </div>`;

    // [추가] Job 리스트 옵션 생성
    // [수정] 초기에는 로딩 표시, 팝업 생성 후 비동기로 채움
    let jobOptions = '<option value="">로딩 중...</option>';
    const jobDisplay = isSurvey ? 'block' : 'none';

    // [추가] 조사 메모인 경우 공개 메모 체크박스 상태 설정
    let publicAttr = '';
    if (isSurvey) {
        publicAttr = 'checked disabled';
    } else {
        publicAttr = isPublic ? 'checked' : '';
    }

    // [추가] 삭제 권한 로직: 본인 글이거나 공개된 글이면 삭제 가능
    const isMine = existingMemo ? (existingMemo.username === state.currentUser) : true;
    const canDelete = existingMemo ? (isMine || isPublic) : false;

    let actionButtonsHtml = '';
    if (memoId && canDelete) {
        actionButtonsHtml = `<div style="display:flex; gap:5px;">
            <button id="popupMemoDeleteBtn" class="btn btn-danger" style="flex:1; padding:5px; font-size:12px;">삭제</button>
            <button id="popupMemoSaveBtn" class="btn btn-primary" style="flex:1; padding:5px; font-size:12px;">수정</button>
        </div>`;
    } else {
        actionButtonsHtml = `<button id="popupMemoSaveBtn" class="btn btn-primary" style="width:100%; padding:5px; font-size:12px;">저장</button>`;
    }

    const popupContent = document.createElement('div');
    popupContent.style.width = '200px';
    popupContent.innerHTML = `
        <div id="quickJobPicker" style="margin-bottom:10px; padding:8px; background:#fff9db; border:1px solid #fab005; border-radius:6px; display:none;">
            <div style="font-size:11px; font-weight:bold; color:#f08c00; margin-bottom:5px; display:flex; align-items:center; gap:3px;">👷 빠른 조사 설정 (Job 선택)</div>
            <div class="job-chips" style="display:flex; gap:4px; flex-wrap:wrap; max-height:80px; overflow-y:auto;">
            </div>
        </div>
        ${matchedPhotosHtml} <!-- 자동 매칭된 사진 영역 -->
        <textarea id="popupMemoInput" style="width:100%; height:80px; margin-bottom:5px; font-size:13px;">${content}</textarea>
        <div style="display:flex; gap:5px; margin-bottom:5px;">
            <button class="btn btn-info" style="flex:1; padding:5px; font-size:16px;" onclick="document.getElementById('popupMemoFile').click()" title="파일 선택">📁</button>
            <button class="btn btn-secondary" style="flex:1; padding:5px; font-size:16px;" onclick="document.getElementById('popupMemoCamera').click()" title="사진 촬영">📷</button>
        </div>
        <!-- [수정] multiple 속성 추가 및 핸들러 변경 -->
        <input type="file" id="popupMemoFile" accept="image/*" multiple style="display:none" onchange="window.handleMemoImageSelect(this, 'popupMemoPreview')">
        <input type="file" id="popupMemoCamera" accept="image/*" capture="environment" multiple style="display:none" onchange="window.handleMemoImageSelect(this, 'popupMemoPreview')">
        
        <div id="popupMemoPreview" style="margin-bottom:5px; min-height:10px; max-height:150px; overflow-y:auto;">
            ${existingImgHtml}
            <!-- 새 이미지는 여기에 추가됨 -->
        </div>
        <input type="hidden" id="popupMemoUrl" value="${existingImgUrls.join(',')}">
        <label style="font-size:12px; display:flex; align-items:center; margin-bottom:5px;">
            <input type="checkbox" id="popupMemoSurvey" ${isSurvey ? 'checked' : ''}> 조사 메모
        </label>
        <div id="popupMemoJobContainer" style="display:${jobDisplay}; margin-bottom:5px; padding-left:5px;">
             <select id="popupMemoJobSelect" style="width:100%; padding:5px; font-size:12px; border:1px solid #ddd; border-radius:4px;">${jobOptions}</select>
        </div>
        <label style="font-size:12px; display:flex; align-items:center; margin-bottom:5px;">
            <input type="checkbox" id="popupMemoPublic" ${publicAttr}> 공개 메모 (다른 사용자와 공유)
        </label>
        ${actionButtonsHtml}
        ${infoHtml}
        ${mapLinksHtml}
    `;

    const popup = new maplibregl.Popup({ closeOnClick: false })
        .setLngLat(coords)
        .setDOMContent(popupContent)
        .addTo(cadMap);

    // [추가] 비동기로 Job 리스트 로드 및 적용
    if (window.fetchAvailableJobs) {
        window.fetchAvailableJobs().then(jobs => {
            const picker = popupContent.querySelector('#quickJobPicker');
            const chipsCont = popupContent.querySelector('.job-chips');
            const select = popupContent.querySelector('#popupMemoJobSelect');

            // 빠른 선택 칩(Chips) 생성
            if (jobs && jobs.length > 0) {
                picker.style.display = 'block';
                jobs.forEach(j => {
                    const btn = document.createElement('button');
                    btn.innerText = j;
                    btn.className = 'btn btn-outline';
                    btn.style.cssText = 'padding:2px 8px; font-size:11px; border-radius:12px; border-color:#fab005; color:#e67e22; background:white;';
                    
                    if (j === jobName) {
                        btn.style.background = '#fab005';
                        btn.style.color = '#fff';
                    }

                    btn.onclick = () => {
                        const surveyChk = popupContent.querySelector('#popupMemoSurvey');
                        const jobCont = popupContent.querySelector('#popupMemoJobContainer');
                        const pubChk = popupContent.querySelector('#popupMemoPublic');

                        // 자동 설정 로직
                        surveyChk.checked = true;
                        jobCont.style.display = 'block';
                        select.value = j;
                        pubChk.checked = true;
                        pubChk.disabled = true;

                        // UI 피드백 (하이라이트)
                        chipsCont.querySelectorAll('button').forEach(b => { b.style.background = 'white'; b.style.color = '#e67e22'; });
                        btn.style.background = '#fab005';
                        btn.style.color = '#fff';
                    };
                    chipsCont.appendChild(btn);
                });
            }

            if (select) {
                let opts = '<option value="">Job 선택</option>';
                jobs.forEach(j => {
                    const selected = j === jobName ? 'selected' : '';
                    opts += `<option value="${j}" ${selected}>${j}</option>`;
                });
                select.innerHTML = opts;
            }
        });
    }

    // [추가] 팝업 열릴 때 전역 파일 배열 초기화
    window.currentMemoFiles = [];

    currentPopup = popup;
    popup.on('close', () => {
        if (currentPopup === popup) {
            currentPopup = null;
            // [추가] 팝업 닫힐 때 선택된 파일들 초기화
            window.currentMemoFiles = [];
        }
    });

    // [추가] 팝업 내 textarea 입력 불가 문제 해결 (이벤트 전파 차단)
    const textarea = popupContent.querySelector('#popupMemoInput');
    if (textarea) {
        // 키보드 이벤트가 지도로 전파되는 것을 막아 입력이 가능하게 함
        ['keydown', 'keyup', 'keypress', 'input'].forEach(evt => textarea.addEventListener(evt, e => e.stopPropagation()));
        setTimeout(() => textarea.focus(), 100); // 팝업 열린 후 포커스
    }

    // [추가] 조사 메모 체크 시 Job 선택 박스 토글
    popupContent.querySelector('#popupMemoSurvey').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        popupContent.querySelector('#popupMemoJobContainer').style.display = isChecked ? 'block' : 'none';
        
        // [추가] 조사 메모 체크 시 공개 메모 강제 설정
        const pubChk = popupContent.querySelector('#popupMemoPublic');
        if (isChecked) {
            pubChk.checked = true;
            pubChk.disabled = true;
        } else {
            pubChk.disabled = false;
        }
    });

    // [추가] 삭제 버튼 이벤트 핸들러
    const delBtn = popupContent.querySelector('#popupMemoDeleteBtn');
    if (delBtn) {
        delBtn.onclick = async () => {
            if(confirm("정말로 이 메모를 삭제하시겠습니까?")) {
                try {
                    await callSupabaseDirect(`memos?id=eq.${memoId}`, 'DELETE');
                    if(window.loadMemoList) window.loadMemoList(); // 목록 갱신
                    if(window.loadMapMemos) window.loadMapMemos(); // 지도 마커 갱신
                    popup.remove(); // 팝업 닫기
                    showAlert("메모가 삭제되었습니다.");
                } catch (e) { console.error(e); alert("삭제 실패: " + e.message); }
            }
        };
    }

    popupContent.querySelector('#popupMemoSaveBtn').onclick = async () => {
        const newContent = popupContent.querySelector('#popupMemoInput').value;
        const newIsPublic = popupContent.querySelector('#popupMemoPublic').checked; // [추가] 공개 여부 값
        const newIsSurvey = popupContent.querySelector('#popupMemoSurvey').checked; // [추가] 조사 여부 값
        const newJobName = popupContent.querySelector('#popupMemoJobSelect').value; // [추가] Job 값
        const existingImages = popupContent.querySelector('#popupMemoUrl').value; // 기존 이미지 URL들
        const files = (window.currentMemoFiles && window.currentMemoFiles.length > 0) ? [...window.currentMemoFiles] : []; // 새 파일들 복사
        
        if (!newContent.trim()) return alert("내용을 입력하세요.");
        
        // managers.js의 saveMemo 호출 (window 객체 통해 접근하거나 직접 구현)
        if (window.saveMemo) {
            // [수정] memoId를 함께 전달하여 수정/신규 구분
            const saveSuccess = await window.saveMemo(state.currentCadProjectId, coords[0], coords[1], newContent, layer, memoId, newIsPublic, existingImages, newIsSurvey, newJobName, tmX, tmY, chainage, files);
            
            if (saveSuccess) { // 저장 성공 시에만 팝업 닫기
                window.currentMemoFiles = []; // 전달 후 즉시 초기화
                popup.remove();
            }
        } else {
            alert("저장 기능 오류");
        }
    };
}

// [추가] 거리 측정 모드 토글
export function toggleDistanceMode() {
    state.isDistanceMode = !state.isDistanceMode;
    const btn = document.getElementById('btnDistanceMeasure');
    const statusEl = document.getElementById('cadStatus');
    
    if (state.isDistanceMode) {
        btn.classList.add('active');
        btn.style.backgroundColor = '#ffc107'; // 활성화 색상
        statusEl.innerText = '거리 측정: 첫 번째 지점을 선택하세요.';
        cadMap.getCanvas().style.cursor = 'crosshair'; // 커서 변경
    } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
        statusEl.innerText = '도면 로드 완료';
        cadMap.getCanvas().style.cursor = '';
        clearDistanceMeasurement();
    }
}

// [추가] 거리 측정 클릭 핸들러
function handleDistanceClick(coords) {
    const lon = coords[0];
    const lat = coords[1];
    const statusEl = document.getElementById('cadStatus');

    // 1. 시작점이 없는 경우 (첫 번째 클릭)
    if (!state.distanceStartPoint) {
        state.distanceStartPoint = { lon, lat };
        
        // 시작점 마커 표시
        const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8 })
            .setLngLat([lon, lat])
            .addTo(cadMap);
        state.distanceMarkers.push(startMarker);
        
        statusEl.innerText = '거리 측정: 두 번째 지점을 선택하세요.';
    } 
    // 2. 시작점이 있는 경우 (두 번째 클릭 -> 거리 계산)
    else {
        const start = state.distanceStartPoint;
        const end = { lon, lat };
        
        // 끝점 마커 표시
        const endMarker = new maplibregl.Marker({ color: '#dc3545', scale: 0.8 })
            .setLngLat([lon, lat])
            .addTo(cadMap);
        state.distanceMarkers.push(endMarker);

        // 거리 계산 (MapLibre LngLat 객체 활용)
        const from = new maplibregl.LngLat(start.lon, start.lat);
        const to = new maplibregl.LngLat(end.lon, end.lat);
        const distance = from.distanceTo(to); // 미터 단위 반환
        
        // 선 그리기 (GeoJSON Source & Layer 추가)
        const lineId = `dist-line-${Date.now()}`;
        cadMap.addSource(lineId, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [[start.lon, start.lat], [end.lon, end.lat]]
                }
            }
        });
        cadMap.addLayer({
            'id': lineId,
            'type': 'line',
            'source': lineId,
            'layout': { 'line-join': 'round', 'line-cap': 'round' },
            'paint': { 'line-color': '#000000', 'line-width': 3, 'line-dasharray': [2, 2] }
        });
        // 레이어 ID 저장 (삭제용)
        state.distanceMarkers.push({ type: 'layer', id: lineId });

        // 결과 팝업 표시 (중간 지점 또는 끝점)
        // [수정] 커스텀 닫기 버튼 (빨간색, 우측 상단)
        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'padding-right: 20px; position: relative; min-width: 60px;';
        popupContent.innerHTML = `<div style="font-weight:bold; font-size:14px;">${distance.toFixed(2)}m</div>`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border: none; border-radius: 4px; width: 20px; height: 20px; font-size: 18px; line-height: 1; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;';
        
        popupContent.appendChild(closeBtn);

        const popup = new maplibregl.Popup({ closeOnClick: false, closeButton: false, offset: 10 })
            .setLngLat([end.lon, end.lat])
            .setDOMContent(popupContent)
            .addTo(cadMap);
        
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            clearDistanceMeasurement();
        };

        state.distanceMarkers.push(popup);

        // 상태 초기화 (연속 측정을 위해 시작점 리셋)
        state.distanceStartPoint = null;
        statusEl.innerText = `측정 완료: ${distance.toFixed(2)}m. 다시 측정하려면 첫 지점을 선택하세요.`;
    }
}

// [추가] 거리 측정 초기화 (마커, 선 제거)
function clearDistanceMeasurement() {
    state.distanceStartPoint = null;
    
    if (state.distanceMarkers) {
        state.distanceMarkers.forEach(item => {
            if (item.remove) {
                item.remove(); // Marker, Popup 제거
            } else if (item.type === 'layer') {
                if (cadMap && cadMap.getLayer(item.id)) cadMap.removeLayer(item.id);
                if (cadMap && cadMap.getSource(item.id)) cadMap.removeSource(item.id);
            }
        });
    }
    state.distanceMarkers = [];
}

// loadCadMap 완료 시 인터랙션 설정 호출
const originalLoadCadMap = loadCadMap;
loadCadMap = async function(projectId) {
    await originalLoadCadMap(projectId);
    loadProjectPhotos(); // [추가] 사진 목록 로드 (비동기)
    setupMapInteraction();
};
