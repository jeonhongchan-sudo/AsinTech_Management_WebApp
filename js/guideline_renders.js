import { PDF_TOC_DATA, UIS_DATA, ROAD_LEDGER_ITEMS, NETWORK_RTK_DATA, NON_CONFORMITY_CASES_DATA, NUMERIC_MAP_DATA, GNSS_NOTICE_DATA, PUBLIC_SURVEY_FAQ_DATA, REGULATION_REVISION_DATA, MATERIAL_ABBREVIATION_DATA, PUBLIC_SURVEY_REGULATIONS_DATA } from './data.js';

/** 지침서 선택 및 화면 전환 제어 */
export function selectGuideline(type) {
    document.querySelectorAll('.guide-menu-item').forEach(b => b.classList.remove('active'));
    document.getElementById('menu-guide-' + type)?.classList.add('active');

    const titleEl = document.getElementById('currentPdfTitle');
    const containers = {
        uis: document.getElementById('uisCodeTableContainer'),
        rtk: document.getElementById('networkRtkContainer'),
        nonConformity: document.getElementById('nonConformityContainer'),
        road: document.getElementById('roadLedgerTocContainer'),
        numericMap: document.getElementById('numericMapContainer'),
        gnssNotice: document.getElementById('gnssNoticeContainer'),
        faq: document.getElementById('faqContainer'),
        regulationRevision: document.getElementById('regulationRevisionContainer'),
        materialAbbr: document.getElementById('materialAbbrContainer'),
        publicSurveyReg: document.getElementById('publicSurveyRegContainer')
    };

    // 모든 컨테이너 숨기기
    Object.values(containers).forEach(c => { if(c) c.style.display = 'none'; });
    
    if (type === 'uis') {
        titleEl.innerText = 'UIS 시설물 측량 코드표';
        containers.uis.style.display = 'block';
        renderUISTable();
    } else if (type === 'rtk') {
        titleEl.innerText = NETWORK_RTK_DATA.title;
        if(containers.rtk) {
            containers.rtk.style.display = 'block';
            renderNetworkRtk();
        }
    } else if (type === 'nonConformity') {
        titleEl.innerText = NON_CONFORMITY_CASES_DATA.title;
        if(containers.nonConformity) {
            containers.nonConformity.style.display = 'block';
            renderNonConformityCases();
        }
    } else if (type === 'road') {
        titleEl.innerText = '2024 도로대장 작성 지침';
        if(containers.road) {
            containers.road.style.display = 'block';
            renderRoadLedgerTOC();
        }
    } else if (type === 'numericMap') {
        titleEl.innerText = NUMERIC_MAP_DATA.title;
        if(containers.numericMap) {
            containers.numericMap.style.display = 'block';
            renderNumericMap();
        }
    } else if (type === 'gnssNotice') {
        titleEl.innerText = GNSS_NOTICE_DATA.title;
        if(containers.gnssNotice) {
            containers.gnssNotice.style.display = 'block';
            renderGnssNotice();
        }
    } else if (type === 'faq') {
        titleEl.innerText = PUBLIC_SURVEY_FAQ_DATA.title;
        if(containers.faq) {
            containers.faq.style.display = 'block';
            renderPublicSurveyFaq();
        }
    } else if (type === 'regulationRevision') {
        titleEl.innerText = REGULATION_REVISION_DATA.documentTitle;
        if(containers.regulationRevision) {
            containers.regulationRevision.style.display = 'block';
            renderRegulationRevision();
        }
    } else if (type === 'materialAbbr') {
        titleEl.innerText = MATERIAL_ABBREVIATION_DATA.documentTitle;
        if(containers.materialAbbr) {
            containers.materialAbbr.style.display = 'block';
            renderMaterialAbbr();
        }
    } else if (type === 'publicSurveyReg') {
        titleEl.innerText = PUBLIC_SURVEY_REGULATIONS_DATA.documentTitle;
        if(containers.publicSurveyReg) {
            containers.publicSurveyReg.style.display = 'block';
            renderPublicSurveyRegulations();
        }
    }
}

/** 도로대장 목차 렌더링 */
export function renderRoadLedgerTOC() {
    const container = document.getElementById('roadLedgerTocContainer');
    if (!container || container.innerHTML.trim() !== '') return;
    
    const tocData = PDF_TOC_DATA['Contents (목차)'];
    const pdfBaseUrl = "https://drive.google.com/file/d/1mysxDT9bfxcdh2-DXDW9NLnOZOCRQ7lF/view?usp=drive_link";
    
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:15px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">2024 도로대장 작성 지침 목차</h2>
                <a href="${pdfBaseUrl}" target="_blank" class="btn btn-primary" style="text-decoration:none;">📄 PDF</a>
             </div>`;
    
    html += `<div class="toc-list" style="display:flex; flex-direction:column; gap:8px;">`;
    
    tocData.forEach(item => {
        const realPage = item.page + 14; 
        const link = `${pdfBaseUrl}#page=${realPage}`;
        
        html += `<a href="${link}" target="_blank" style="display:flex; justify-content:space-between; padding:12px 15px; background:#f8f9fa; border:1px solid #eee; border-radius:5px; text-decoration:none; color:#333; transition:background 0.2s;">
                    <span style="font-weight:500;">${item.title}</span>
                    <span style="color:#007bff; font-size:0.9em;">p.${item.page} (PDF p.${realPage})</span>
                 </a>`;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
}

/** UIS 시설물 코드표 렌더링 */
export function renderUISTable() {
    const container = document.getElementById('uisCodeTableContainer');
    if (!container || container.innerHTML.trim() !== '') return;
    if (!UIS_DATA) return;

    let html = `<table class="uis-table" style="width:100%;"><thead><tr><th style="text-align:left; padding-left:15px; padding-right:10px;">명칭</th><th style="width:70px; text-align:center;">코드</th><th style="width:50px; text-align:center; padding-right:15px;">형태</th></tr></thead><tbody>`;
    UIS_DATA.forEach(group => {
        html += `<tr><td colspan="3" class="uis-group-header">${group.category}</td></tr>`;
        group.items.forEach(item => {
            let nameDisplay = item.name + (ROAD_LEDGER_ITEMS.has(item.name) ? ` <span class="badge-ledger">도</span>` : '');
            html += `<tr><td style="text-align:left; padding-left:15px; padding-right:10px; word-break: break-all;">${nameDisplay}</td><td style="font-family:monospace;font-weight:bold; text-align:center;">${item.code}</td><td style="text-align:center; padding-right:15px;">${item.type}</td></tr>`;
        });
    });
    container.innerHTML = html + `</tbody></table>`;
}

/** 네트워크RTK 서비스 안내 렌더링 */
export function renderNetworkRtk() {
    const container = document.getElementById('networkRtkContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NETWORK_RTK_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
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
            const rowSpans = rows.map(() => ({ addr: 0, info: 0 }));
            for (let i = 0; i < rows.length; i++) {
                if (i === 0 || rows[i].connectionAddress !== rows[i-1].connectionAddress) {
                    let span = 1;
                    for (let j = i + 1; j < rows.length; j++) { if (rows[j].connectionAddress === rows[i].connectionAddress) span++; else break; }
                    rowSpans[i].addr = span;
                }
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
                if (rowSpans[i].addr > 0) html += `<td rowspan="${rowSpans[i].addr}" style="vertical-align: middle; background: #fff;">${row.connectionAddress}</td>`;
                html += `<td>${row.serviceNameBefore}</td>`;
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

/** 성과심사 부적합 사례 렌더링 */
export function renderNonConformityCases() {
    const container = document.getElementById('nonConformityContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NON_CONFORMITY_CASES_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <h4 style="color:#555; margin-bottom:5px;">${data.subtitle}</h4>
                <p style="color:#666; font-size:0.9em; margin-bottom: 10px;">발행: ${data.publicationInfo.publisher} (${data.publicationInfo.date})</p>
                <a href="https://drive.google.com/file/d/1UMnxoPJjZ4NM_KNTTsk6oAMfz-l_qqgb/view?usp=drive_link" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;
    data.contents.forEach(chapter => {
        html += `<div style="margin-top: 30px;"><h3 style="border-left: 5px solid #dc3545; padding-left: 10px; margin-bottom: 15px; color: #333;">${chapter.chapter}. ${chapter.title}</h3>`;
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
            chapter.nonConformityStats.details.forEach(row => { html += `<tr><td>${row.type}</td><td style="text-align:center;">${row.count}</td></tr>`; });
            html += `</tbody></table>`;
        }
        if (chapter.cases) {
            chapter.cases.forEach((c) => {
                html += `<div style="border:1px solid #eee; padding:15px; margin-bottom:10px; border-radius:5px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                            <h4 style="margin:0 0 10px 0; color:#d63384;">${c.title}</h4>
                            <p><strong>문제점:</strong> ${c.issue}</p>
                            <p style="margin-top:5px; color:#666; font-size:0.95em;">${c.detail}</p>
                         </div>`;
            });
        }
        if (chapter.solutions) {
            html += `<table class="uis-table"><thead><tr><th>원인</th><th>해결방안</th></tr></thead><tbody>`;
            chapter.solutions.forEach(sol => { html += `<tr><td>${sol.cause}</td><td>${sol.solution}</td></tr>`; });
            html += `</tbody></table>`;
        }
        html += `</div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

/** 수치지도 도엽번호 안내 렌더링 */
export function renderNumericMap() {
    const container = document.getElementById('numericMapContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = NUMERIC_MAP_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;
    data.content.forEach(section => {
        html += `<div style="margin-bottom: 25px;"><h3 style="border-left: 5px solid #28a745; padding-left: 10px; margin-bottom: 15px; color: #333;">${section.heading}</h3>`;
        if (section.text) html += `<p style="line-height: 1.6; color: #555;">${section.text}</p>`;
        if (section.table) {
            html += `<table class="uis-table"><thead><tr><th>축척</th><th>도엽번호 예시</th><th>설명</th></tr></thead><tbody>`;
            section.table.forEach(row => { html += `<tr><td>${row.scale}</td><td style="font-family:monospace; font-weight:bold;">${row.example}</td><td>${row.desc}</td></tr>`; });
            html += `</tbody></table>`;
        }
        html += `</div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

/** GNSS 관측 방식 주의사항 렌더링 */
export function renderGnssNotice() {
    const container = document.getElementById('gnssNoticeContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = GNSS_NOTICE_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;
    html += `<div style="background-color: #fff3cd; color: #856404; padding: 20px; border-radius: 5px; border: 1px solid #ffeeba; margin-bottom: 25px;">
                <p style="font-size: 1.1em; font-weight: bold; margin-bottom: 10px;">${data.mainNotice.text}</p>
                <p style="font-size: 0.9em; margin-bottom: 10px;">${data.mainNotice.footnote}</p>
                <p style="color: #dc3545; font-weight: bold;">※ ${data.mainNotice.warning}</p>
             </div>`;
    html += `<h3 style="border-left: 5px solid #007bff; padding-left: 10px; margin-bottom: 15px; color: #333;">주요 준수 사항</h3><ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 5px; margin-bottom: 30px;">`;
    data.checkpoints.forEach(pt => { html += `<li style="margin-bottom: 8px; font-weight: 500;">${pt}</li>`; });
    html += `</ul>`;
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

/** 공공측량 FAQ 렌더링 */
export function renderPublicSurveyFaq() {
    const container = document.getElementById('faqContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = PUBLIC_SURVEY_FAQ_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; position: relative;">
                <h2 style="margin-bottom:10px; padding-top: 10px;">${data.title}</h2>
                <p style="color:#666; font-size:0.9em; margin-bottom: 10px;">발행: ${data.publisher}</p>
                <a href="${data.pdfUrl}" target="_blank" class="btn btn-primary" style="text-decoration: none;">📄 PDF</a>
             </div>`;
    data.chapters.forEach(chapter => {
        html += `<div style="margin-top: 30px;"><h3 style="border-left: 5px solid #667eea; padding-left: 10px; margin-bottom: 20px; color: #333;">${chapter.chapterNumber}. ${chapter.chapterTitle}</h3>`;
        chapter.questions.forEach(q => {
            html += `<div style="margin-bottom: 25px; border: 1px solid #eee; border-radius: 8px; padding: 15px; background: #fcfcfc;">`;
            html += `<h4 style="margin-bottom: 10px; color: #007bff;">Q${q.qId}. ${q.question}</h4>`;
            if (q.answer) html += `<p style="margin-bottom: 10px; line-height: 1.6;">${q.answer}</p>`;
            if (q.note) html += `<p style="font-size: 0.9em; color: #666; background: #f1f1f1; padding: 8px; border-radius: 4px;">※ ${q.note}</p>`;
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
            if (q.process) { html += `<ol style="padding-left: 20px; margin-top: 10px;">`; q.process.forEach(p => html += `<li style="margin-bottom: 5px;">${p}</li>`); html += `</ol>`; }
            if (q.facilityScope) { html += `<ul style="list-style-type: disc; padding-left: 20px; margin-top: 10px;">`; q.facilityScope.forEach(item => html += `<li style="margin-bottom: 5px;">${item}</li>`); html += `</ul>`; }
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
                html += `<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; font-family: monospace;"><strong>📂 ${q.folderStructureExample.root}</strong><ul style="list-style: none; padding-left: 20px; margin-top: 5px;">`;
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

/** 작업규정 개정 안내 렌더링 */
export function renderRegulationRevision() {
    const container = document.getElementById('regulationRevisionContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = REGULATION_REVISION_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;"><h2 style="margin-bottom:10px;">${data.documentTitle}</h2><h4 style="color:#555;">${data.subHeader}</h4></div>`;
    html += `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;"><h3 style="margin-bottom: 10px; color: #007bff;">주요 개정 내용</h3><p style="line-height: 1.7;">${data.description}</p></div>`;
    html += `<h3 style="border-left: 5px solid #28a745; padding-left: 10px; margin-bottom: 15px;">개정 전-후 비교</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">`;
    data.revisionComparison.forEach(phase => {
        const isBefore = phase.phase === '개정 전';
        const headerBg = isBefore ? '#ffebee' : '#e8f5e9';
        const headerColor = isBefore ? '#c62828' : '#2e7d32';
        html += `<div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);"><div style="background-color: ${headerBg}; color: ${headerColor}; padding: 15px; font-weight: bold; font-size: 1.1em; text-align: center;">${phase.phase} <span style="font-size: 0.9em; opacity: 0.8;">(${phase.phaseEnglish})</span></div><ul style="padding: 20px 20px 20px 40px; margin: 0; background: #fff;">`;
        phase.details.forEach(detail => html += `<li style="margin-bottom: 10px;">${detail}</li>`);
        html += `</ul></div>`;
    });
    html += `</div><div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #eee; background: #f8f9fa; border-radius: 0 0 8px 8px;"><p style="margin-bottom: 10px;">${data.footerNote}</p><a href="${data.referenceUrl}" target="_blank" class="btn btn-info btn-sm">국토정보플랫폼</a></div></div>`;
    container.innerHTML = html;
}

/** 재질약어표 렌더링 */
export function renderMaterialAbbr() {
    const container = document.getElementById('materialAbbrContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = MATERIAL_ABBREVIATION_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;"><h2 style="margin-bottom:10px;">${data.documentTitle}</h2></div>`;
    data.tables.forEach(table => {
        html += `<h3 style="border-left: 5px solid #ffc107; padding-left: 10px; margin-bottom: 15px; margin-top: 30px;">${table.tableName}</h3>`;
        if (table.data && table.data.length > 0) {
            const headers = Object.keys(table.data[0]);
            const headerTitles = { category: '구분', symbol: '기호', unit: '단위', abbreviation: '약어', originalTerm: '원어', description: '설명', relatedUndergroundFacilities: '관련 지하시설물' };
            html += `<div style="overflow-x: auto;"><table class="uis-table" style="min-width: 800px;"><thead><tr>`;
            headers.forEach(header => { html += `<th>${headerTitles[header] || header}</th>`; });
            html += `</tr></thead><tbody>`;
            table.data.forEach(row => { html += `<tr>`; headers.forEach(header => { html += `<td>${row[header]}</td>`; }); html += `</tr>`; });
            html += `</tbody></table></div>`;
        }
    });
    html += `</div>`;
    container.innerHTML = html;
}

/** 공공측량 작업규정 본문 렌더링 */
export function renderPublicSurveyRegulations() {
    const container = document.getElementById('publicSurveyRegContainer');
    if (container.innerHTML.trim() !== '') return;
    const data = PUBLIC_SURVEY_REGULATIONS_DATA;
    let html = `<div style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">`;
    html += `<div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px;"><h2 style="margin-bottom:10px;">${data.documentTitle}</h2></div>`;
    data.parts.forEach(part => {
        html += `<div style="margin-top: 40px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fdfdff;"><h3 style="border-left: 5px solid #8e44ad; padding-left: 10px; margin-bottom: 20px;">${part.partTitle}</h3>`;
        part.articles.forEach(article => {
            html += `<div style="margin-bottom: 20px; padding-left: 10px;"><h4 style="color: #2980b9; margin-bottom: 10px;">${article.articleId} ${article.title || ''}</h4>`;
            const renderContent = (content) => {
                if (!content) return;
                if (Array.isArray(content)) {
                    content.forEach(item => {
                        if (typeof item === 'string') html += `<p style="line-height: 1.7; margin-bottom: 5px;">${item}</p>`;
                        else if (typeof item === 'object' && item !== null) {
                            if (item.term && item.definition) {
                                html += `<p style="margin-left: 20px; line-height: 1.7;"><strong>${item.term}:</strong> ${item.definition}</p>`;
                                if (item.subItems) { html += `<ul style="margin-left: 40px; list-style-type: lower-alpha; margin-top: 5px;">`; item.subItems.forEach(sub => html += `<li style="margin-bottom: 3px;">${sub}</li>`); html += `</ul>`; }
                            } else if (item.table) {
                                html += `<div style="overflow-x: auto; margin-top: 15px;"><table class="uis-table"><caption>${item.table.title}</caption><thead><tr>`;
                                item.table.columns.forEach(col => html += `<th>${col}</th>`);
                                html += `</tr></thead><tbody>`;
                                item.table.data.forEach(row => { html += `<tr>`; item.table.columns.forEach(colKey => html += `<td>${row[colKey] || ''}</td>`); html += `</tr>`; });
                                html += `</tbody></table></div>`;
                            } else if (item.type === 'sublist-alpha' && item.items) {
                                html += `<ul style="margin-left: 20px; list-style-type: lower-alpha; margin-top: 5px;">`;
                                item.items.forEach(sub => html += `<li style="margin-bottom: 3px;">${sub}</li>`);
                                html += `</ul>`;
                            } else if (item.type === 'color-codes' && item.items) {
                                html += `<ul style="margin-left: 20px; list-style-type: none; padding-left: 0; margin-top: 5px;">`;
                                item.items.forEach(sub => html += `<li style="margin-bottom: 3px;"><strong>${sub.facility}:</strong> ${sub.color}</li>`);
                                html += `</ul>`;
                            } else if (item.content) html += `<p style="line-height: 1.7;">${item.index ? `${item.index}. ` : ''}${item.content}</p>`;
                        }
                    });
                } else if (typeof content === 'string') html += `<p style="line-height: 1.7;">${content}</p>`;
            };
            if (article.intro) html += `<p><em>${article.intro}</em></p>`;
            renderContent(article.content || article.paragraphs || article.definitions);
            if (article.steps) { html += `<ol style="margin-left: 20px; margin-top: 10px;">`; article.steps.forEach(step => html += `<li style="line-height: 1.7; margin-bottom: 5px;">${step}</li>`); html += `</ol>`; }
            html += `</div>`;
        });
        html += `</div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}