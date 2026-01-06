// e:\Program\SelfProgram\아신테크\js\data.js

export const ROAD_LEDGER_ITEMS = new Set([
    "도로경계", "보차도경계", "도로/보차도 교차점", "자전거(횡단)도로", "횡단보도", "과속방지턱", "신호등", 
    "가로등", "보안등", "횡단보도/육교 보안등", "버스정류장(승강장)", "버스표지판", "택시정류장(승강장)", 
    "방호(방지)책", "가드펜스", "가드레일", "지시표지판", "규제 표지판", "주의표지판", "보조표지판", 
    "갈매기표지판", "안내표지판", "도로정보판", "사설안내표지판", "새주소 가로명판", "가로수", 
    "차량충격흡수시설", "중앙분리대", "도로반사경", "방설.제설함", "CCTV (교통정보)", "무인카메라(단속)", 
    "석축(하단)", "옹벽(하단)", "측구", "콘크리트담"
]);

export const UIS_DATA = [
      { category: "도로시설물 - 경계", items: [
          { name: "도로경계", code: "DO", type: "선" },
          { name: "보차도경계", code: "ID", type: "선" },
          { name: "도로/보차도 교차점", code: "DOB", type: "선" },
          { name: "자전거(횡단)도로", code: "CD", type: "선" },
          { name: "포장구분", code: "GUB", type: "선" },
          { name: "차량진출입", code: "NC", type: "면" },
          { name: "보도턱낮춤", code: "DX", type: "선" }
      ]},
      { category: "도로시설물 - 도로면", items: [
          { name: "횡단보도", code: "HI", type: "면" },
          { name: "미끄럼방지턱", code: "MI", type: "면" },
          { name: "주차장", code: "JU", type: "면" },
          { name: "과속방지턱", code: "DC", type: "면" },
          { name: "버스전용차선", code: "JY", type: "면" }
      ]},
      { category: "교통시설", items: [
          { name: "신호등", code: "SE", type: "점" },
          { name: "가로등", code: "GA", type: "점" },
          { name: "보안등", code: "BO", type: "점" },
          { name: "횡단보도/육교 보안등", code: "BMW", type: "점" },
          { name: "가로등점멸기", code: "RE", type: "점" },
          { name: "신호등제어기", code: "JE", type: "점" },
          { name: "지중변압기", code: "ET", type: "점" },
          { name: "점멸기", code: "JM", type: "점" },
          { name: "기타분전함", code: "KB", type: "점" },
          { name: "조명탑", code: "RT", type: "점" },
          { name: "경광등(투광등)", code: "KW", type: "점" },
          { name: "버스정류장(승강장)", code: "BPB", type: "점" },
          { name: "버스표지판", code: "BP", type: "점" },
          { name: "택시정류장(승강장)", code: "TXB", type: "점" },
          { name: "택시표지판", code: "TX", type: "점" },
          { name: "자전거보관소", code: "CP", type: "점" }
      ]},
      { category: "전주/통신", items: [
          { name: "전력주", code: "EI", type: "점" },
          { name: "통신주", code: "TI", type: "점" },
          { name: "유선주", code: "UI", type: "점" },
          { name: "공동주", code: "GI", type: "점" },
          { name: "지지(공)주", code: "BI", type: "점" },
          { name: "철탑", code: "CT", type: "면" }
      ]},
      { category: "맨홀", items: [
          { name: "공동구맨홀", code: "DM", type: "점" },
          { name: "가스맨홀", code: "GM", type: "점" },
          { name: "통신맨홀", code: "TM", type: "점" },
          { name: "전기맨홀", code: "EM", type: "점" },
          { name: "송유맨홀", code: "MH", type: "점" },
          { name: "난방(증기)맨홀", code: "NM", type: "점" },
          { name: "경찰맨홀", code: "PM", type: "점" },
          { name: "기타맨홀", code: "KM", type: "점" },
          { name: "집수정", code: "MB", type: "점" }
      ]},
      { category: "방호울타리", items: [
          { name: "방호(방지)책", code: "BJ", type: "선" },
          { name: "가드펜스", code: "GF", type: "선" },
          { name: "가드레일", code: "GR", type: "선" }
      ]},
      { category: "교통표지판", items: [
          { name: "지시표지판", code: "PL", type: "점" },
          { name: "규제 표지판", code: "PX", type: "점" },
          { name: "주의표지판", code: "PC", type: "점" },
          { name: "보조표지판", code: "PY", type: "점" },
          { name: "갈매기표지판", code: "PZ", type: "점" }
      ]},
      { category: "도로표지판", items: [
          { name: "안내표지판", code: "PI", type: "점" },
          { name: "도로정보판", code: "PJ", type: "점" },
          { name: "사설안내표지판", code: "PS", type: "점" },
          { name: "새주소 가로명판", code: "PA", type: "점" }
      ]},
      { category: "조경시설", items: [
          { name: "가로수", code: "GS", type: "점" },
          { name: "화단(조경화단)", code: "HD", type: "면" },
          { name: "분수", code: "BUN", type: "점" },
          { name: "벤치", code: "BH", type: "점" },
          { name: "기타조형(구조)물", code: "KG", type: "점" },
          { name: "수벽", code: "SU", type: "면" }
      ]},
      { category: "입체시설", items: [
          { name: "지하도입구", code: "UN", type: "면" },
          { name: "교차로", code: "OS", type: "면" },
          { name: "교량/복개도로", code: "BG", type: "면" },
          { name: "육교", code: "OP", type: "면" },
          { name: "계단", code: "ST", type: "면" },
          { name: "터널", code: "TN", type: "면" },
          { name: "철도교차", code: "CR", type: "면" },
          { name: "입체교차로", code: "IC", type: "면" },
          { name: "고가도로", code: "SG", type: "면" },
          { name: "지하보도", code: "UG", type: "면" },
          { name: "지하차도", code: "UG", type: "면" },
          { name: "지하통로", code: "UG", type: "면" },
          { name: "지하상가", code: "UG", type: "면" }
      ]},
      { category: "안전시설", items: [
          { name: "장애인유도블럭", code: "JP", type: "선" },
          { name: "장/유 교차점", code: "JPP", type: "선" },
          { name: "차방(볼라드)", code: "CA", type: "점" },
          { name: "차량충격흡수시설", code: "CB", type: "선" },
          { name: "중앙분리대", code: "JB", type: "선" },
          { name: "교통섬", code: "TJ", type: "면" },
          { name: "안전지대", code: "SZ", type: "면" },
          { name: "차단기", code: "CH", type: "점" },
          { name: "제한높이시설", code: "NO", type: "선" },
          { name: "교통안전시설", code: "AB", type: "점" },
          { name: "도로반사경", code: "BN", type: "점" },
          { name: "규제(시선유도)봉", code: "CJ", type: "선" },
          { name: "방설.제설함", code: "SAND", type: "점" }
      ]},
      { category: "광고/점용/기타", items: [
          { name: "인구게시탑", code: "IN", type: "점" },
          { name: "광고탑", code: "CF", type: "점" },
          { name: "게시판 (현수막)", code: "GE", type: "점" },
          { name: "시계탑", code: "WT", type: "점" },
          { name: "가판대", code: "GP", type: "면" },
          { name: "구두수선대", code: "SS", type: "면" },
          { name: "버스표판매대", code: "TK", type: "면" },
          { name: "방범초소", code: "BC", type: "면" },
          { name: "생활정보지", code: "GC", type: "점" },
          { name: "주차장관리소", code: "JM", type: "면" },
          { name: "우체통", code: "PB", type: "점" },
          { name: "공중전화 박스", code: "TB", type: "점" },
          { name: "식수대", code: "SD", type: "점" },
          { name: "CCTV (교통정보)", code: "TV", type: "점" },
          { name: "무인카메라(단속)", code: "MCA", type: "점" },
          { name: "도로원표", code: "STM", type: "점" }
      ]},
      { category: "기타 (선형)", items: [
          { name: "석축(하단)", code: "SN", type: "선" },
          { name: "옹벽(하단)", code: "OB", type: "선" },
          { name: "측구", code: "CU", type: "선" },
          { name: "콘크리트담", code: "DAM", type: "선" },
          { name: "제방", code: "JB", type: "선" }
      ]},
      { category: "상수시설물", items: [
          { name: "상수맨홀", code: "SM", type: "" },
          { name: "제수변", code: "J", type: "" },
          { name: "유량계", code: "Y", type: "" },
          { name: "이토변", code: "E", type: "" },
          { name: "수압계", code: "SS", type: "" },
          { name: "감압변", code: "K", type: "" },
          { name: "안전변", code: "AN", type: "" },
          { name: "공기변", code: "A", type: "" },
          { name: "계량기", code: "S", type: "" },
          { name: "가압장", code: "KA", type: "" },
          { name: "지수전", code: "G", type: "" },
          { name: "급수탑", code: "KP", type: "" },
          { name: "배수지", code: "BA", type: "" },
          { name: "스탠파이프", code: "SP", type: "" },
          { name: "심도", code: "숫자", type: "" }
      ]},
      { category: "하수시설물", items: [
          { name: "우수맨홀", code: "WM", type: "점" },
          { name: "오수맨홀", code: "OM", type: "점" },
          { name: "우수받이", code: "WB", type: "점" },
          { name: "오수받이", code: "OB", type: "점" },
          { name: "환풍기(환기구)", code: "HH", type: "점" },
          { name: "토구", code: "TG", type: "점" },
          { name: "RCB타점", code: "RL", type: "면" },
          { name: "우수라인", code: "WL", type: "선" },
          { name: "오수라인", code: "OL", type: "선" },
          { name: "측구", code: "CU", type: "선" },
          { name: "차수거", code: "CH", type: "점" },
          { name: "우수토실", code: "WT", type: "점" },
          { name: "펌프장", code: "PM", type: "점" }
      ]}
];

export const PDF_TOC_DATA = {
      "Contents (목차)": [
        { title: "제1장 총칙", page: 5 }, { title: "1. 일반사항", page: 7 },
        { title: "제2장 도로대장 공간정보 체계", page: 13 }, { title: "1. 개요", page: 15 },
        { title: "2. 도로대장 공간정보 레이어 체계", page: 17 }, { title: "3. 도로대장 공간정보 아이디 체계", page: 20 },
        { title: "4. 도로대장 공간정보 좌표 체계", page: 29 }, { title: "5. 도로대장 공간정보 관리 체계", page: 30 },
        { title: "제3장 도로대장 공간정보 구축", page: 33 }, { title: "1. 개요", page: 35 },
        { title: "2. 도로대장 공간정보 구축", page: 40 }, { title: "2.1 총괄 레이어", page: 40 },
        { title: "2.2 교량 레이어", page: 58 }, { title: "2.3 터널 레이어", page: 75 },
        { title: "2.4 육교 레이어", page: 87 }, { title: "2.5 지하차도 레이어", page: 96 },
        { title: "2.6 고가도로 레이어", page: 107 }, { title: "2.7 인터체인지(IC) 레이어", page: 117 },
        { title: "2.8 교차시설 레이어", page: 124 }, { title: "2.9 차도부경계 레이어", page: 129 },
        { title: "2.10 중앙분리대 레이어", page: 132 }, { title: "2.11 석축 레이어", page: 137 },
        { title: "2.12 옹벽 레이어", page: 141 }, { title: "2.13 깎기비탈면 레이어", page: 146 },
        { title: "2.14 쌓기비탈면 레이어", page: 150 }, { title: "2.15 표지 레이어", page: 154 },
        { title: "2.16 전광표지 레이어", page: 165 }, { title: "2.17 졸음쉼터 레이어", page: 169 },
        { title: "2.18 과속방지턱 레이어", page: 174 }, { title: "2.19 거리표 레이어", page: 179 },
        { title: "2.20 지하보도 레이어", page: 183 }, { title: "2.21 도로중심선교점 레이어", page: 192 },
        { title: "2.22 오르막차로 레이어", page: 196 }, { title: "2.23 종단경사 레이어", page: 200 },
        { title: "2.24 정차대 레이어", page: 204 }, { title: "2.25 측구 레이어", page: 208 },
        { title: "2.26 배수암거 및 배수관 레이어", page: 212 }, { title: "2.27 낙석방지시설 레이어", page: 217 },
        { title: "2.28 가로등 레이어", page: 221 }, { title: "2.29 신호등 레이어", page: 226 },
        { title: "2.30 방호울타리 레이어", page: 230 }, { title: "2.31 충격흡수시설 레이어", page: 235 },
        { title: "2.32 방음시설 레이어", page: 240 }, { title: "2.33 가로수 레이어", page: 246 },
        { title: "2.34 지하매설물 레이어", page: 251 }, { title: "2.35 공동구 레이어", page: 256 },
        { title: "2.36 과적검문소 레이어", page: 259 }, { title: "2.37 제설시설 레이어", page: 263 },
        { title: "2.38 통로박스 레이어", page: 267 }, { title: "2.39 생태통로 레이어", page: 272 },
        { title: "2.40 긴급제동시설 레이어", page: 276 }, { title: "2.41 실연장 레이어", page: 281 },
        { title: "2.42 도로구역 레이어", page: 285 }, { title: "2.43 유료도로 레이어", page: 289 },
        { title: "2.44 우회도로 레이어", page: 293 }, { title: "2.45 접도구역 레이어", page: 297 },
        { title: "2.46 도로점용 레이어", page: 300 }, { title: "2.47 측점(STATION) 레이어", page: 304 },
        { title: "제4장 도로대장 공간정보 제출", page: 307 }, { title: "1. 도로대장 공간정보 검수", page: 309 },
        { title: "2. 성과품 납품", page: 319 }
      ]
};

export const NETWORK_RTK_DATA = {
  "title": "국토지리정보원 네트워크RTK 서비스 변경 안내",
  "effectiveDate": "<시행일 : '22. 5. 2. 09시>",
  "sections": [
    {
      "sectionNumber": 1,
      "heading": "네트워크RTK(VRS, FKP) 주소변경!",
      "details": [
        "VRS 서비스 접속 주소(URL) 변경 : RTS1.ngii.go.kr",
        "FKP 서비스 접속주소(URL), 포트 변경: RTS2.ngii.go.kr"
      ],
      "note": "* 접속포트는 2201에서 2101로 변경",
      "addressChangeTable": [
        {
          "before": "vrs3.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "after": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)"
        },
        {
          "before": "fkp.ngii.go.kr : 2201 (Geo++ 社 GNSMART2)",
          "after": "RTS2.ngii.go.kr : 2101 (Geo++ 社 GNSMART2)"
        }
      ]
    },
    {
      "sectionNumber": 2,
      "heading": "네트워크RTK 서비스명칭 변경!",
      "subHeading": "서비스명칭의 통합·정리, 직관적인 명칭으로 변경!",
      "note": "* RTCM 3.2 는 Multi-GNSS 이용 가능",
      "serviceNameChangeTable": [
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "VRS-RTCM31",
          "serviceNameAfter": "VRS-RTCM31(통합)",
          "serviceContent": "VRS, RTCM 3.1",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "VRS-CMRPlus",
          "serviceNameAfter": "VRS-CMRx",
          "serviceContent": "VRS, CMRx",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "VRS-CMRx",
          "serviceNameAfter": "VRS-CMRx",
          "serviceContent": "VRS, CMRx",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "VRS-CMR",
          "serviceNameAfter": "VRS-CMRx",
          "serviceContent": "VRS, CMRx",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "VRS-RTCM23",
          "serviceNameAfter": "VRS-RTCM23(통합)",
          "serviceContent": "VRS, RTCM 2.3",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "SB_AutoSelection_RTCM32",
          "serviceNameAfter": "RTK-RTCM32",
          "serviceContent": "Single-RTK, RTCM 3.2",
          "publicSurveyPerformanceReviewAvailability": "X"
        },
        {
          "connectionAddress": "RTS1.ngii.go.kr : 2101 (Trimble 社 PIVOT)",
          "serviceNameBefore": "SB_AutoSelection_CMRx",
          "serviceNameAfter": "RTK-RTCM32",
          "serviceContent": "Single-RTK, RTCM 3.2",
          "publicSurveyPerformanceReviewAvailability": "X"
        },
        {
          "connectionAddress": "RTS2.ngii.go.kr : 2101 (Geo++ 社 GNSMART2)",
          "serviceNameBefore": "VRS_V31",
          "serviceNameAfter": "VRS-RTCM31",
          "serviceContent": "VRS, RTCM 3.1",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS2.ngii.go.kr : 2101 (Geo++ 社 GNSMART2)",
          "serviceNameBefore": "VRS_V32",
          "serviceNameAfter": "VRS-RTCM32",
          "serviceContent": "VRS, RTCM 3.2",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS2.ngii.go.kr : 2101 (Geo++ 社 GNSMART2)",
          "serviceNameBefore": "FKP_V31",
          "serviceNameAfter": "FKP-RTCM31",
          "serviceContent": "FKP, RTCM 3.1",
          "publicSurveyPerformanceReviewAvailability": "O"
        },
        {
          "connectionAddress": "RTS2.ngii.go.kr : 2101 (Geo++ 社 GNSMART2)",
          "serviceNameBefore": "SSRG",
          "serviceNameAfter": "SSR-SSRG",
          "serviceContent": "SSR, SSRG(State Space Representation)",
          "publicSurveyPerformanceReviewAvailability": "X"
        }
      ]
    }
  ],
  "footer": {
    "organization": "국토지리정보원",
    "contact": "문의전화 : 위치기준과 031) 210-2652, 5, 6"
  }
};

export const NON_CONFORMITY_CASES_DATA = {
  "title": "공공측량 성과심사 부적합 사례집",
  "subtitle": "지하시설물도 (Underground Facilities Map)",
  "publicationInfo": {
    "publisher": "공간정보품질관리원",
    "date": "2024. 11",
    "number": "11-B554453-000014-14"
  },
  "contents": [
    {
      "chapter": "I",
      "title": "지하공간정보의 이해",
      "sections": [
        {
          "heading": "주요 용어 정의",
          "terms": [
            { "term": "공공기준점측량", "def": "국가/공공기준점에 기초하여 새로운 공공기준점(삼각점, 수준점)의 위치와 높이를 정하는 측량" },
            { "term": "기지점 / 미지점", "def": "성과를 이미 알고 있는 기준점 / 공공기준점측량에 의해 설치될 기준점" },
            { "term": "3차원 망조정", "def": "기지점의 3차원 좌표를 이용하여 미지점의 좌표를 구하는 작업" },
            { "term": "RTCM", "def": "GNSS 고정국에서 이동국으로 보정 신호를 보내어 실시간으로 위치를 알아내는 방법" }
          ]
        }
      ]
    },
    {
      "chapter": "II",
      "title": "성과심사 현황 (2020~2023)",
      "stats": [
        { "label": "연평균 접수", "value": "5,121건" },
        { "label": "지하시설물도 비중", "value": "85.03%" },
        { "label": "지상현황측량 비중", "value": "12.53%" }
      ],
      "nonConformityStats": {
        "title": "지하시설물도 부적합 현황 (총 824건)",
        "details": [
          { "type": "현지심사(위치/속성 정확도)", "count": 125 },
          { "type": "정위치편집(코드, 인접, 방향 등)", "count": 206 },
          { "type": "구조화편집", "count": 38 },
          { "type": "기타(작성시기 등)", "count": 80 }
        ]
      }
    },
    {
      "chapter": "III",
      "title": "유형별 주요 부적합 사례",
      "cases": [
        {
          "title": "사례 1: 공공삼각점 (Network RTK)",
          "issue": "관측시간 부족 (10초 미만)",
          "detail": "B점의 세션 1, 2 관측 시간이 고정해(Fixed) 이후 10초 미만으로 규정 미달"
        },
        {
          "title": "사례 2: 공공삼각점 (GNSS)",
          "issue": "수평위치 허용오차 초과",
          "detail": "성과심사 결과 수평 위치 편차가 12cm 이상 발생하여 허용오차(10cm) 초과"
        },
        {
          "title": "사례 3: Network RTK 관측 오류",
          "issue": "세션 간 편차 초과",
          "detail": "세션 간 좌표 편차가 최대 1.28m 발생하여 허용범위(5cm) 초과 (3차원 망조정 미실시 등 원인)"
        },
        {
          "title": "사례 4: 공공수준점",
          "issue": "폐합차 허용범위 초과",
          "detail": "왕복 수준측량 결과 폐합차가 2.2m 발생하여 허용오차(47mm)를 크게 초과"
        }
      ]
    },
    {
      "chapter": "IV",
      "title": "원인 및 해결방안 요약",
      "solutions": [
        { "cause": "GNSS 3차원 망조정 미실시", "solution": "3차원 망조정 실시 및 계산과정 검토" },
        { "cause": "관측 정밀도/시간 미준수", "solution": "Network RTK 세션 교차 및 관측 시간 준수하여 재측량" },
        { "cause": "수준측량 허용오차 초과", "solution": "전체 또는 일부 구간 재측량하여 오차 범위 내 성과 확보" },
        { "cause": "시설물 누락/오기", "solution": "정위치 편집 파일 검토 및 현장 일치 여부 확인 후 수정" }
      ]
    }
  ]
};

export const NUMERIC_MAP_DATA = {
  "title": "수치지도 도엽번호 안내",
  "pdfUrl": "https://drive.google.com/file/d/1-TI3CJ1kR5uTOi1Zjs1EWcreqWsAlR9v/view?usp=drive_link",
  "content": [
    {
      "heading": "수치지도 도엽번호 체계 개요",
      "text": "수치지도의 도엽번호는 축척에 따라 고유한 번호 체계를 가지고 있습니다. 이를 통해 지도의 위치와 범위를 식별할 수 있습니다."
    },
    {
      "heading": "주요 축척별 도엽번호 구성",
      "table": [
        { "scale": "1:50,000", "example": "NJ52-9-19", "desc": "국가 기본도, 지형도 (경위도 좌표 기반)" },
        { "scale": "1:25,000", "example": "NJ52-9-19-1", "desc": "1:50,000 도엽을 4등분 (1~4)" },
        { "scale": "1:5,000", "example": "377051", "desc": "6자리 숫자 (도엽명 포함)" },
        { "scale": "1:1,000", "example": "37705199", "desc": "8자리 숫자 (지하시설물도 등)" }
      ]
    }
  ]
};

export const GNSS_NOTICE_DATA = {
  "title": "공공측량 GNSS 관측 방식 주의사항",
  "pdfUrl": "https://drive.google.com/file/d/1TaJS8taKPYRB9MBTTm2Irh6j1f0gSue8/view?usp=drive_link",
  "mainNotice": {
    "text": "GNSS장비에 탑재된 기능*(IMU, 카메라, 레이저 등)을 활용하여 GNSS 수신기를 연직방향으로 세우지 않는 등 위치를 결정하는 GNSS 관측 방식은 공공측량 작업규정에서 정한 관측방식이 아닙니다.",
    "footnote": "* 기능 : IMU(Inertial Measurement Unit), 카메라, 레이저 측정기기 등",
    "warning": "이 경우 공공측량 성과심사 시 부적합 처리됨을 알려드립니다."
  },
  "checkpoints": [
    "GNSS 수신기는 반드시 연직방향(수직)으로 세워서 관측해야 합니다.",
    "기울어진 상태에서의 관측(Tilt 보정 등)은 공공측량에서 인정되지 않습니다.",
    "카메라, 레이저 등을 이용한 간접 측정 방식은 허용되지 않습니다."
  ],
  "regulations": [
    {
      "title": "「공공측량 작업규정」 제8조",
      "content": [
        "① 수행자는 법 제92조 제1항 및 시행령 제97조 제1항에 따른 측량기기를 공공측량에 사용하는 때에는 성능검사를 마친 기기를 사용한다."
      ],
      "note": "* 성능검사의 기준, 방법 및 절차 등이 정확해야 함"
    },
    {
      "title": "「공공측량 작업규정」 제206조",
      "content": [
        "② 안테나 폴은 선점한 측점 위에 정확히 위치시킨다.",
        "③ 안테나 폴은 지지대를 이용하여 고정하고 연직방향으로 조정한다."
      ]
    }
  ]
};

export const PUBLIC_SURVEY_FAQ_DATA = {
  "title": "공공측량제도 FAQ",
  "pdfUrl": "https://drive.google.com/file/d/16dYNys1o6OIImYkugXN53p_7-qjKSjnR/view?usp=drive_link",
  "publisher": "공간정보품질관리원 (Spatial Information Quality Management Service)",
  "chapters": [
    {
      "chapterNumber": "01",
      "chapterTitle": "공공측량 제도 (Public Survey System)",
      "questions": [
        {
          "qId": 1,
          "question": "국가·지자체 및 공공기관에서 실시하는 모든 측량이 공공측량에 해당하나요?",
          "answer": "국가, 지자체 및 공공기관은 공공측량 시행자로 규정되는 바, 동 기관에서 실시하는 모든 측량은 공공측량에 해당합니다. 다만, 고도의 정확도가 필요로 하지 않는 등 법률의 적용을 받지 아니하는 경우는 공공측량에서 제외됩니다.",
          "note": "국지적 측량, 고도의 정확도가 필요하지 않은 측량, 순수 학술연구나 군사 활동을 위한 측량 등 (국토지리정보원고시 제2022-821호)"
        },
        {
          "qId": 2,
          "question": "건설회사에서 측량을 실시하는 경우에도 공공측량 성과심사를 받을 수 있나요?",
          "answer": "건설회사에서 실시하는 측량은 일반측량에 해당하므로 공공측량 성과 심사의 대상이 아닙니다. 다만, 일반측량 중 공공측량으로 지정(「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제3조)하여 고시된 경우에는 성과 심사의 대상에 해당합니다."
        },
        {
          "qId": 3,
          "question": "도시가스사업자 또는 기간통신사업자가 지하시설물 측량을 하는 경우에도 공공측량으로 지정 고시 절차가 필요한가요?",
          "answer": "「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제2조제6호에 따라 지하시설물 측량을 수행하는 「도시가스사업법」에 따른 도시가스사업자와 「전기통신사업법」에 따른 기간 통신 사업자는 공공측량 시행자에 해당하므로 공공측량 지정 고시가 필요하지 않습니다."
        },
        {
          "qId": 4,
          "question": "「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제3조의 공공측량 규모에 해당하지 않는데 공공측량으로 실시하나요?",
          "answer": "해당 조항은 국가, 지방자치단체 및 「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제2조에 따른 공공측량 시행자 외의 자가 실시하는 측량 중 공공의 이해와 안전과 밀접한 관계가 있어 공공측량으로 지정받아야 하는 규모입니다."
        },
        {
          "qId": 5,
          "question": "공공측량을 하는 경우 기존에 측량한 성과를 사용할 수 있나요?",
          "answer": "공공측량은 기존에 고시된 기본측량이나 공공측량성과를 기초로 사용할 수 있습니다."
        },
        {
          "qId": 6,
          "question": "설계에 수반되는 측량을 공공측량으로 해야 하나요?",
          "answer": "「건설기술 진흥법 시행령」 제74조 및 「설계공모, 기본설계 등의 시행 및 설계의 경제성 등 검토에 관한 지침」 제44조 [별표 2] 각 공종별 측량 항목 및 기준에 「공간정보의 구축 및 관리 등에 관한 법률」과 「공공측량 작업규정」 및 발주청이 별도로 정한 기준을 따르도록 하고 있습니다."
        },
        {
          "qId": 7,
          "question": "설계측량은 지하시설물 측량과 달리 다른 건설공사 최종성과는 아닌데 공공측량으로 활용가치가 있나요?",
          "answer": "건설공사 설계측량의 경우 설계 전 단계에서 실시함으로써 정확한 설계가 이루어질 수 있도록 「건설기술 진흥법」에 규정하고 있습니다. 또한, 도로·상하수도 등의 경우 설계측량 당시 실시된 기준점 측량성과 등은 GIS 구축 시 활용 가능합니다."
        },
        {
          "qId": 8,
          "question": "“일반측량업” 등록업체가 공공측량 제도를 이행할 수 있나요?",
          "answer": "「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제34조 제2항 [별표 7]에 따라 “일반측량업”을 등록한 자도 측량설계금액이 3천만 원 이하의 공공측량을 수행할 수 있도록 하고 있어, 공공측량 제도를 이행할 수 있습니다. (3천만 원은 측량 관련 대가 금액이며 부가가치세를 포함하지 않은 금액입니다.)"
        },
        {
          "qId": 9,
          "question": "공공측량 제도이행 절차도",
          "processSteps": [
            { "step": 1, "action": "공공측량 작업계획서 제출 (실시 3일 전까지)", "actor": "공공측량 시행자 -> 국토지리정보원" },
            { "step": 2, "action": "작업계획서 검토 및 결과 알림", "actor": "국토지리정보원 -> 공공측량 시행자" },
            { "step": 3, "action": "측량용역 발주 및 계약", "actor": "국가·지자체 등 -> 측량전문업체" },
            { "step": 4, "action": "작업계획서 수립 및 제출", "actor": "측량전문업체 -> 공공측량 시행자 -> 국토지리정보원" },
            { "step": 5, "action": "기준점 측량성과 발급신청 및 측량실시", "actor": "측량전문업체" },
            { "step": 6, "action": "성과심사 신청서 제출", "actor": "공공측량 시행자 -> 공간정보품질관리원" },
            { "step": 7, "action": "성과심사 수수료 납부 및 심사", "actor": "공간정보품질관리원 (20일 이내)" },
            { "step": 8, "action": "결과통지 및 성과 발급", "actor": "공간정보품질관리원 -> 공공측량 시행자" },
            { "step": 9, "action": "결과 고시", "actor": "국토지리정보원 홈페이지 게재" }
          ]
        },
        {
          "qId": 10,
          "question": "공공측량 관련 규정은 어떤 것이 있나요?",
          "relatedRegulations": [
            { "regulationName": "「공간정보의 구축 및 관리 등에 관한 법률」 제17조 및 제18조", "reference": "" },
            { "regulationName": "「공공측량 작업규정」", "reference": "국토지리정보원 고시 제2023-792호" },
            { "regulationName": "「측량성과 심사수탁기관의 심사업무 및 지정절차 등에 관한 규정」", "reference": "국토지리정보원 고시 제2023-791호" },
            { "regulationName": "「수치지형도 작성 작업 및 성과에 관한 규정」", "reference": "국토지리정보원 고시 제2022-3600호" },
            { "regulationName": "「지형도 도식적용 규정」", "reference": "국토지리정보원 고시 제2022-3601호" },
            { "regulationName": "「지도 도식규칙」", "reference": "국토교통부령 제882호" },
            { "regulationName": "「수치지도 작성 작업규칙」", "reference": "국토교통부령 제209호" },
            { "regulationName": "「항공사진측량 작업 및 성과에 관한 규정」", "reference": "국토지리정보원 고시 제2022-3487호" },
            { "regulationName": "「무인비행장치 측량 작업규정」", "reference": "국토지리정보원 고시 제2020-5670호" },
            { "regulationName": "「정사영상 제작 작업 및 성과에 관한 규정」 변경", "reference": "국토지리정보원 고시 제2022-3487호" },
            { "regulationName": "「수치표고모형의 구축 및 관리 등에 관한 규정」", "reference": "국토지리정보원 고시 제2022-4622호" },
            { "regulationName": "「3차원국토공간정보구축 작업 규정」", "reference": "국토지리정보원 고시 제2019-146호" },
            { "regulationName": "「정밀도로지도의 구축 및 갱신 등에 관한 규정」", "reference": "국토지리정보원 고시 제2023-4338호" },
            { "regulationName": "「지하공간통합지도 제작 작업 규정」", "reference": "국토지리정보원 고시 제2018-661호" },
            { "regulationName": "「공간정보 구축 및 관리 등에 관한 법률을 적용받지 아니하는 측량」", "reference": "국토지리정보원 고시 제2022-821호" }
          ]
        },
        {
          "qId": 11,
          "question": "공공측량으로 실시하지 않으면 발주청에 처벌규정이 있나요?",
          "answer": "벌칙이나 과태료에 관한 기준은 없습니다. 하지만 공공측량 제도에 관하여 「공간정보의 구축 및 관리 등에 관한 법률」 제17조 및 제18조의 공공측량 작업계획서 제출 및 성과심사 신청은 “~하여야 한다.”로 법령상 기속행위로 규정되어 있음을 양지하시기 바랍니다."
        },
        {
          "qId": 12,
          "question": "공공측량 작업계획서 제출 및 검토 결과 확인 절차가 궁금합니다.",
          "process": [
            "01. 작업계획서 검토 요청 공문 발송 (시행자)",
            "02. 국토정보 플랫폼에 작업계획서 작성 및 제출 (시행자)",
            "03. 작업계획서 검토 및 결과 통지 (지리원)",
            "04. 국토정보 플랫폼에서 검토 결과 확인 (시행자)"
          ]
        },
        {
          "qId": 13,
          "question": "공공측량 작업계획서가 검토된 이후 작업계획서를 변경하려는 경우에는 어떻게 해야 하나요?",
          "process": [
            "01. 작업계획서 변경 요청 공문 발송 (시행자)",
            "02. 국토정보 플랫폼에 작업계획서 변경 신청 (시행자)",
            "03. 요청사항 검토 (지리원)",
            "04. 국토정보 플랫폼에서 변경된 작업계획서 확인 (시행자)"
          ]
        },
        {
          "qId": 14,
          "question": "공공측량 작업계획서는 왜 변경해야 하나요?",
          "answer": "작업계획을 변경한 경우에는 「공간정보의 구축 및 관리 등에 관한 법률」 제17조제2항 관련 작업계획서를 변경하여야 합니다. 제출한 공공측량 작업계획서를 변경한 경우에는 변경한 작업계획서를 제출하여야 합니다."
        },
        {
          "qId": 15,
          "question": "「공공측량 작업규정」에 신설(‘17.6)된 공공측량 작업계획서 양식과 기존 사용되던 양식의 주된 차이점은 무엇인가요?",
          "answer": "지하시설물측량 작업계획서 작성 시 신설·변경된 관로와 기존에 매설된 관로의 작업방법을 구분하여 구체적으로 기재하여야 하며, 지하시설물의 신설·변경 또는 기존 매설 여부 확인이 가능하도록 지하시설물측량 관련 과업지시서를 첨부하여야 합니다."
        },
        {
          "qId": 16,
          "question": "공공기관에서 연장 20m가량의 소규모 지하시설물을 측량하는 경우에도 공공측량 성과심사를 받아야 하나요?",
          "answer": "50m 미만 실수요자용 지하시설물에 대한 측량은 법률의 적용을 받지 않는 국지적 측량으로 성과심사의 대상에서 제외됩니다. 다만, 공공측량시행자가 공공의 안전 등을 위하여 필요하다고 판단하는 경우에는 법률을 적용받아 성과심사를 받을 수 있습니다."
        },
        {
          "qId": 17,
          "question": "기존에 고시된 측량성과를 공공측량에 사용한 경우, 기고시된 성과도 성과심사를 받아야 하나요?",
          "answer": "측량의 기초로 사용한 기존에 고시된 성과는 성과심사의 대상이 아닙니다. 다만, 고시된 성과를 수정·갱신한 경우에는 성과심사를 받아야 합니다."
        },
        {
          "qId": 18,
          "question": "산지전용허가 신청 등에 제출 목적으로 개인이 측량 도면작성을 하는 경우 공공측량으로 지정될 수 있나요?",
          "answer": "일반측량 중 공공의 이해, 안전과 밀접한 관련이 있는 것은 공공측량으로 지정할 수 있도록 관련 법령에서 규정하고 있습니다. 다만, 개인이 인·허가 신청을 목적으로 하는 측량은 공공의 이해 등과는 관련이 적어 공공측량 지정 대상이 아닌 것으로 판단됩니다."
        },
        {
          "qId": 19,
          "question": "토털스테이션을 이용해 수치지도인 지형현황도 제작을 하려는 경우 수치지도제작업과 공공측량업에 모두 등록하여야 하나요?",
          "answer": "수치지도제작업의 주된 목적은 아날로그인 종이지도 등을 디지털 형태로 수치화하는 것으로, 측량결과가 디지털 형태인 토털스테이션으로 지형현황도를 제작하는 것은 공공측량업만 등록하여도 가능함을 알려드립니다."
        },
        {
          "qId": 20,
          "question": "신규로 설치 또는 변경된 지하시설물은 어떤 방법으로 측량을 하여야 하나요?",
          "answer": "지하시설물을 신규로 설치·변경한 경우에는 「공공측량 작업규정」에 따라 지하시설물을 매설하기 전에 반드시 시설물이 노출된 상태에서 실측(직선 하수관로의 조사측량 포함)해야 합니다."
        },
        {
          "qId": 21,
          "question": "국토정보플랫폼의 업무지원서비스 내 공공측량관리에서는 어떤 업무를 처리할 수 있나요?",
          "answer": "국토정보플랫폼의 업무지원서비스 내 공공측량관리는 공공측량 작업계획서의 제출, 검토 결과 확인 및 공공측량 검색 등 업무지원을 하고 있습니다. (http://map.ngii.go.kr/nw/common/main/mainPage.do)"
        }
      ]
    },
    {
      "chapterNumber": "02",
      "chapterTitle": "공공측량 모니터링 (Public Survey Monitoring)",
      "questions": [
        { "qId": 1, "question": "건설공사 모니터링은 왜 하나요?", "answer": "지난 '21년 11월 공공측량 미이행 기관 모니터링 조사 용역을 진행한 결과, 건설공사 설계측량의 공공측량 제도이행률이 30% 미만으로 조사되어 공공측량제도를 운영하는 국토지리정보원이 추진하고 심사수탁기관인 공간정보품질관리원이 수행하고 있습니다." },
        { "qId": 2, "question": "사전규격 의견에 답변해야 하나요?", "answer": "「지방자치단체를 당사자로 하는 계약에 관한 법률 시행령」 제32조의2 및 정부 입찰·계약 집행기준 제77조에 따라 의견을 받은 날로부터 14일 이내 검토 후 조치하고 통지하도록 하고 있습니다." },
        { "qId": 3, "question": "모니터링 대상은 어떤 사업인가요?", "answer": "「건설기술진흥법」에 따른 건설공사(건축 등 10개분야) 기본 및 실시설계에 수반되는 측량에 대하여 실시하고 있고, 향후 GIS 등 전체 측량 분야로 확대하여 모니터링을 시행할 예정입니다." },
        { "qId": 4, "question": "설계시와 GIS 구축 시 공공측량을 수행하면 중복 실시 되는 게 아닌가요?", "answer": "설계 시 이루어지는 측량은 설계단계에서 지형현황을 정확하게 측량함을 목적으로 하고, GIS 구축은 시설물의 준공 위치를 정확하게 측량함을 목적으로 각각 다른 현황이 측량되고 있어 중복이 아닙니다." },
        { "qId": 5, "question": "공공측량성과심사 신청은 공간정보품질관리원만 가능한가요?", "answer": "공간정보품질관리원은 국토교통부 산하 공공기관이며, 국내 유일의 공공측량성과심사 수탁기관입니다." },
        { "qId": 6, "question": "건설공사 설계측량의 시행시기는 언제인가요?", "answer": "「건설기술진흥법」 시행령 제67조의 건설공사 시행과정에 따라, 기본설계 및 실시설계 단계에서 공공측량을 수행합니다. (준공시설물의 위치측량은 도로, 상하수도 등 지하시설물 측량에 한함)" }
      ]
    },
    {
      "chapterNumber": "03",
      "chapterTitle": "공공측량 성과심사 (Public Survey Performance Review)",
      "questions": [
        { "qId": 1, "question": "공공측량 성과심사는 언제부터 생겨난 제도인가요?", "answer": "공공측량 제도는 「측량법」이 처음 제정될 당시(1961.12.31)에도 정의되어 있었으며, 법률명 변경(측량법 -> 공간정보의 구축 및 관리 등에 관한 법률)에 따라 지속되어 왔습니다." },
        { "qId": 2, "question": "공공측량성과 메타데이터 작성을 위한 기준을 찾아보고 싶은데 어디에서 해당 내용을 볼 수 있나요?", "answer": "공간정보품질관리원 홈페이지 “SIQMS알림” - “공지사항“ - ”메타데이터 작성안내”에서 확인할 수 있습니다." },
        { "qId": 3, "question": "공공측량 성과심사 과정에서 발견된 오류는 어떻게 처리해야 하나요?", "answer": "공간정보품질관리원에서 발견된 오류를 심사결과서에 첨부하여 통지하면, 시행자는 즉시 수정하여 심사수탁기관인 공간정보품질관리원에 제출하여야 합니다." },
        { "qId": 4, "question": "「공공측량 작업규정」에서 정하지 않은 신기술을 활용할 수 있는 방법이 있나요?", "answer": "시행자는 별지 제2호 서식에 따른 '공공측량 작업계획 사전검토 요청서'를 제출하여 검토받을 수 있습니다. 검토대상 기기 또는 방법에 대하여 특례적용의 필요성, 활용사례, 시험장비, 작업방법, 환경 등을 구체적으로 작성해야 합니다." },
        { "qId": 5, "question": "국가기준점 고시(2023. 7. 7.) 이전에 측량된 공공기준점 성과의 고시가 가능한가요?", "answer": "국가기준점 고시 이전에 측량된 공공기준점 성과는 구성과로 고시가 가능합니다. 구성과 또는 신성과 고시여부는 측량시행자의 선택사항입니다." },
        { "qId": 6, "question": "국가기준점 고시(2023. 7. 7.) 이전의 기존 공공기준점의 고시성과를 사용 가능한가요?", "answer": "장기간의 연차 사업인 경우 기존 고시성과(공공기준점)의 사용이 가능합니다. 다만, 추후 연차 사업이 완료된 후에는 일괄 신성과로 재계산하여 사용하시기 바랍니다." },
        { "qId": 7, "question": "국가기준점 고시(2023. 7. 7.) 성과에 포함이 안 된 지역의 성과 사용 여부는 어떻게 되나요?", "answer": "기존 국가기준점 사용은 가능하나, 성과 확인을 위한 추가작업이 필요할 수 있으니 가급적 사용을 자제하시길 바랍니다. 국토지리정보원에서는 제외된 국가기준점에 대해 정확한 성과를 재고시할 예정입니다." },
        { "qId": 8, "question": "네트워크 RTK 방법으로 지하시설물 실시간(관로) 측량을 작업하던 중 국가기준점 정정고시(2023. 7. 7.)가 발생하여, 되메우기 전 실시간(관상고) 측량은 고시 이전 기준점을 활용하여 작업하였는데, 복구(지반고) 측량은 어떤 성과를 써야 하나요?", "answer": "두 가지 방법이 있습니다. 첫째, 복구 측량도 구성과로 실시(모든 성과를 구성과로 변경). 둘째, 실시간 측량 성과를 신성과로 캘리브레이션 재계산(모든 성과를 신성과로 변경)." },
        { "qId": 9, "question": "네트워크 RTK를 이용한 공공삼각점 측량에서 관측시간은 어떻게 되나요?", "answer": "세션 수는 3회, 세션 관측시간은 고정해를 얻고 나서 10초 이상, 데이터 취득 간격은 1초로 관측하시면 됩니다. (현황측량의 경우 세션 수 1회, 5초 이상, 1초 간격)" },
        { "qId": 10, "question": "네트워크 RTK 측량으로 현황측량에서 높이(표고) 측량을 실시할 경우 캘리브레이션은 최소 몇 점 이상으로 진행해야 하나요?", "answer": "최소 5개 (5km×5km 기준)의 수준점을 사용하시되, 작업지역에 균등하게 분포한 점으로 진행하시기 바랍니다." },
        { "qId": 11, "question": "시공과 측량의 분리발주에 따라 매설된 상태로 GIS DB 구축 용역을 발주하였는데 성과심사가 가능한가요?", "answer": "성과심사는 가능합니다. 다만, 판정 기준(지하시설물도 작성 시기)에 따라 부적합을 통보하게 됩니다." },
        { "qId": 12, "question": "실시간 측량을 하지 못했는데 심사시 적합 판정을 받을 수 있는 방법은 없나요?", "answer": "「공공측량 작업규정」 제179조제2항 관련 각호(사전검토 승인, 장비만 진입 등)에 해당하여 지하시설물도를 작성하는 경우는 적합 판정을 통보하게 됩니다." },
        { "qId": 13, "question": "지하시설물측량을 네트워크 RTK 방법으로 할 경우 현장 캘리브레이션 관련한 요건과 제출할 자료를 알려주세요.", "answer": "제출하실 자료는 ①기준점총괄표 및 고시 성과 → 사용기준점 리스트 작성 ②관측망도 ③잔차량 보고서(높이고정점 및 수치 표시) 입니다." },
        { "qId": 14, "question": "지하시설물 실시간 측량시 도로 가포장 상태로 측량한 성과를 심사받으려 하는데 가능 여부와 가포장 비율은 어느 정도까지 허용하나요?", "answer": "도로 가포장 상태에서 측량한 성과는 도로포장 후 심도가 변경될 수 있으므로 심사가 불가합니다. 단, 감독관확인서 등에 재측량 내용이 명기된 경우 심사 진행 및 결과보고서에 보완할 것을 명시합니다." },
        { "qId": 15, "question": "지하시설물측량 관련 테이블설계서와 작업지침서를 시행자에게 요청하였으나 받을 수 없거나 지연되는 경우... 제공이 가능한가요?", "answer": "공간정보품질관리원에서는 타인에게 이를 제공할 권한은 없습니다." },
        { "qId": 16, "question": "지하시설물도 구축을 위한 실시간 측량의 실시 기준은 무엇이고, 구체적으로 어떻게 해야 하나요?", "answer": "2018.1.1.일 기준 신설·변경된 지하시설물은 원칙적으로 노출된 상태에서 실시간 측량을 하여야 합니다." },
        {
          "qId": 17,
          "question": "지하시설물 조사, 탐사 대상 및 범위는 무엇인가요?",
          "facilityScope": [
            "1. 폭이 4m 이상인 도로",
            "2. 관경이 50mm 이상인 수도",
            "3. 관경이 200mm 이상인 하수도",
            "4. 관경이 50mm 이상인 가스공급시설",
            "5. 관경이 50mm 이상인 전기통신설비",
            "6. 관경이 100mm 이상인 전기설비",
            "7. 모든 송유관",
            "8. 모든 난방열관"
          ]
        },
        {
          "qId": 18,
          "question": "3차원공간정보구축 세밀도(LOD)는 어떻게 되나요?",
          "lodTable": [
            { "standard": "3차원국토공간정보구축작업규정 (고시 제2019-0146호)", "levels": ["LOD1", "LOD2", "LOD3", "LOD4"], "note": "반드시 작업계획서에 명시" }
          ]
        },
        { "qId": 19, "question": "무인비행장치를 이용한 기준점측량은 어떻게 하나요?", "answer": "지상기준점은 작업지역의 형태 등을 고려하여 외곽 및 작업지역에 고르게 배치하되, 각 모서리와 중앙 부분에는 지상기준점이 배치되도록 합니다. 수량은 1㎢당 9점 이상을 원칙으로 합니다." },
        {
          "qId": 20,
          "question": "무인비행장치측량으로 수치지도를 처음 제작하여 공공측량성과심사를 받으려는데, 필요한 서류 및 성과품 목록 알려주세요.",
          "requiredDocuments": [
            { "classification": "접수", "item": "성과심사 접수공문", "details": "성과심사 접수공문(직인) 및 성과심사 신청서" },
            { "classification": "촬영", "item": "촬영기록부", "details": "촬영기록부, 코스별검사표, 촬영표정도, 보안 검열 필증 등" },
            { "classification": "촬영", "item": "사진/영상", "details": "디지털 항공사진 원본, 왜곡보정 영상, 카메라 캘리브레이션 데이터" },
            { "classification": "촬영", "item": "GNSS/INS", "details": "지상기준국 데이터(PPK), GNSS/INS 데이터(E.O값)" },
            { "classification": "측량", "item": "측량성과철", "details": "지상기준점/검사점 측량데이터, 기준·수준 망도, 성과기록부 등" },
            { "classification": "벡터화 방법", "item": "수치지면/표면자료", "details": "DTD, DTM, DSM (불필요한 지면자료 제거)" },
            { "classification": "벡터화 방법", "item": "정사영상", "details": "불연속선(Breakline), 정사영상데이터(Geotiff)" },
            { "classification": "수치도화 방법", "item": "AT성과철", "details": "지상기준점 색인도, AT 프로젝트 전체파일, 조정 레포트" },
            { "classification": "수치도화 방법", "item": "도화데이터", "details": "도화데이터" },
            { "classification": "수치도화 방법", "item": "인덱스", "details": "모델인덱스, 작업경계(Boundary)" },
            { "classification": "수치지형도", "item": "지리조사/정위치편집/도면제작", "details": "지리조사 야장, 정위치편집 데이터, 도면제작편집 데이터(dwg), 인덱스" }
          ]
        },
        {
          "qId": 21,
          "question": "무인비행장치측량 성과접수 시 폴더구성을 어떻게 해야 하나요?",
          "folderStructureExample": {
            "root": "검토2023-0000 사업명",
            "folders": [
              "#최종성과",
              "1.무인항공사진촬영",
              "2.사진기준점측량",
              "3.지상기준점측량",
              "4.수치표면자료 (벡터화 방법일 경우) / 4.지형지물묘사(수치도화) (수치도화 방법일 경우)",
              "5.정사영상 (벡터화 방법일 경우) / 5.수치지형도제작 (수치도화 방법일 경우)",
              "6.지형지물묘사(수치도화) (벡터화 방법일 경우)",
              "7.수치지형도제작 (벡터화 방법일 경우)"
            ]
          }
        },
        { "qId": 22, "question": "항공사진측량 및 무인비행장치측량 지리조사시 대상 및 범위가 어떻게 되나요?", "answer": "조사 당시 나타난 지형ㆍ지물과 이에 관련되는 지명ㆍ명칭을 대상으로 하며, 범위는 별표 2(교통, 건물, 시설, 식생, 수계, 지형 등)를 기준으로 합니다." },
        {
          "qId": 23,
          "question": "항공사진측량 및 무인비행장치측량 지리조사시 조사도면에 어떻게 표기해야 하나요?",
          "mappingTable": [
            {"layer": "일반주택", "abbr": "조립식 주택→조(주)"},
            {"layer": "철책", "abbr": "철책"},
            {"layer": "무벽건물", "abbr": "무"},
            {"layer": "온실", "abbr": "온실(VH)"},
            {"layer": "공사중건물", "abbr": "공사중"},
            {"layer": "가건물", "abbr": "가, 조립식가건물→조(가), 콘테이너→콘, 천막→천, 차양(챙)→챙"},
            {"layer": "주택외 건물", "abbr": "외, 조립식 주택외→조(외)"},
            {"layer": "가로수", "abbr": "木"},
            {"layer": "콘크리트돌담", "abbr": "콘담, 돌담"},
            {"layer": "판자담", "abbr": "판담"},
            {"layer": "생울타리", "abbr": "생울"},
            {"layer": "흙담", "abbr": "흙담"},
            {"layer": "게시판", "abbr": "게시"},
            {"layer": "안내표지", "abbr": "안내"},
            {"layer": "지시표지", "abbr": "지시"},
            {"layer": "규제표지", "abbr": "규제"},
            {"layer": "주의표시", "abbr": "주의"},
            {"layer": "광고판", "abbr": "광고"},
            {"layer": "전력주", "abbr": "E"}
          ]
        },
        {
          "qId": 24,
          "question": "항공사진측량시 네트워크 RTK를 이용한 지상기준점 측량방법?",
          "accuracyTable": [
            {"scale": "1/500~1/600", "gsd": "8cm 이내", "rmse": "±0.05m 이내"},
            {"scale": "1/1,000~1/1,200", "gsd": "12cm 이내", "rmse": "±0.10m 이내"},
            {"scale": "1/2,500~1/3,000", "gsd": "25cm 이내", "rmse": "±0.15m 이내"},
            {"scale": "1/5,000~1/6,000", "gsd": "42cm 이내", "rmse": "±0.20m 이내"},
            {"scale": "1/10,000 이하", "gsd": "65cm 이내", "rmse": "±0.30m 이내"}
          ]
        },
        { "qId": 25, "question": "영상지도 제작 시 무인비행장치촬영과 항공사진촬영의 차이점이 무엇인가요?", "answer": "촬영 면적, 해상도, 접합라인 설정 등 공정과정 및 세부 작업방법에 차이가 있습니다. 항공사진촬영은 넓은 면적에 유리하며, 무인비행장치촬영은 좁은 면적에 현저히 적은 양의 사진으로 제작이 가능합니다. 무인비행장치는 불연속선 설정이 완벽하지 않은 경우 재작업을 해야 합니다." },
        { "qId": 26, "question": "국토정보플랫폼에서 지도 다운로드시 성과심사(간행)대상인가요?", "answer": "지도의 변형 없이 출처를 밝히고 사용할 때는 심사 대상이 아니나, 기본측량성과 등을 사용하여 지도를 간행(판매 및 배포)하는 경우에는 성과심사 대상입니다." },
        { "qId": 27, "question": "LIDAR 측량할 때 수준측량은 어떻게 해야 하나요?", "answer": "4급 기준점 측량방법 및 간접수준측량이 허용되나 반드시 1등 또는 2등 수준점의 높이와 연결해서 타원체고와 정표고를 산출해야 합니다." },
        {
          "qId": 28,
          "question": "LIDAR 표고 자료의 제작가능한 격자간격이 궁금합니다.",
          "lidarGridSpecs": [
            {"gridSize": "1m x 1m", "rmse": "0.5m 이내", "maxError": "0.75m 이내"},
            {"gridSize": "5m x 5m", "rmse": "1.0m 이내", "maxError": "2.0m 이내"},
            {"gridSize": "90m", "note": "국토지리정보원장은 한반도 전역에 대하여 공개 가능한 수치표고모형 제공을 위해 구축 가능"}
          ]
        },
        {
          "qId": 29,
          "question": "LIDAR 표고 자료 심사시 제출성과는 어떤 것이 있나요?",
          "fileStructure": [
            {"category": "Plan", "subFolder": "planner", "format": "pdf/hwp", "desc": "과업지시서"},
            {"category": "Plan", "subFolder": "planner", "format": "dxf", "desc": "대상지역 경계도"},
            {"category": "Plan", "subFolder": "worker", "format": "pdf/hwp", "desc": "작업시행계획서"},
            {"category": "Survey", "subFolder": "air/report", "format": "pdf/xls", "desc": "관련보고서"},
            {"category": "Survey", "subFolder": "air/flight", "format": "txt", "desc": "비행코스 궤적파일"},
            {"category": "Survey", "subFolder": "ground/gnss_ins", "format": "txt", "desc": "GNSS/INS 성과자료"},
            {"category": "Survey", "subFolder": "ground/report", "format": "pdf/xls", "desc": "관련보고서"},
            {"category": "Laser", "subFolder": "course_name", "format": "txt", "desc": "원시자료"},
            {"category": "Check", "subFolder": "report", "format": "pdf/xls", "desc": "관련 보고서"},
            {"category": "DSD", "subFolder": "report", "format": "*", "desc": "정표고 변환 보고서"},
            {"category": "DSD", "subFolder": "ellipse/ortho", "format": "las", "desc": "수치표면자료"},
            {"category": "DTD", "subFolder": "report", "format": "pdf/xls", "desc": "관련보고서"},
            {"category": "DTD", "subFolder": "ellipse/ortho", "format": "las", "desc": "수치지면자료"},
            {"category": "DEM", "subFolder": "report", "format": "pdf/xls", "desc": "관련보고서"},
            {"category": "DEM", "subFolder": "grid", "format": "dat/txt", "desc": "도엽별 수치표고모형 관리파일"}
          ]
        }
      ]
    },
    {
      "chapterNumber": "04",
      "chapterTitle": "공공측량 심사신청 (Public Survey Review Application)",
      "questions": [
        { "qId": 1, "question": "공공측량성과심사 접수는 어떻게 하나요?", "answer": "공공측량시행자(수행자)는 공공측량성과의 사본을 우편(등기)이나 직접 방문하여 접수하시면 됩니다. 서식은 공간정보품질관리원 홈페이지에서 확인 가능합니다." },
        { "qId": 2, "question": "우편(등기)으로 성과물 제출했는데 접수가 되었는지 어떻게 알아볼 수 있나요?", "answer": "공간정보품질관리원 홈페이지(공공측량성과심사 > 성과심사 진행현황)에서 심사번호, 사업명, 시행자로 검색하여 확인할 수 있습니다." },
        { "qId": 3, "question": "성과심사 기간은 며칠 걸리나요?", "answer": "접수일로부터 20일 이내입니다. 단, 기상악화, 심사량 과다(지상현황측량 등 10㎢ 이상, 지하시설물 200km 이상) 등의 경우 10일 범위에서 연장할 수 있습니다." },
        { "qId": 4, "question": "성과심사 수수료가 얼마인지 알고 싶습니다.", "answer": "공간정보품질관리원 홈페이지 수수료 안내 메뉴를 참고하거나 02-6418-9133으로 문의바랍니다." },
        { "qId": 5, "question": "공공측량 성과심사 수수료는 누가 납부하나요?", "answer": "원칙적으로 공공측량시행자가 납부해야 하나, 용역계약서에 반영된 경우 공공측량수행자가 위임을 받아 납부할 수 있습니다." },
        { "qId": 6, "question": "성과심사 수수료는 언제까지 납부해야 하나요?", "answer": "수수료 통지를 받은 날부터 7일 이내에 납부해야 합니다." },
        { "qId": 7, "question": "성과심사가 완료된 후 고시된 내용을 어디서 확인하나요?", "answer": "국토지리정보원 국토정보플랫폼(공공측량관리 > 공공측량검색)에서 확인 가능합니다. (부적합 또는 일시표지일 경우 고시 안됨)" },
        { "qId": 8, "question": "성과심사가 완료되었는데 성과물 반출은 어떻게 하는 건가요?", "answer": "홈페이지에서 '심사완료 성과물 택배 발송 신청서'를 작성하여 팩스로 보내면 착불로 발송됩니다. (수수료 미납 시 발송 불가)" }
      ]
    }
  ]
};

export const REGULATION_REVISION_DATA = {
  "documentTitle": "공공측량 작업규정 개정('25.4.23.) 안내",
  "subHeader": "공공측량에서 네트워크 RTK 방식의 현황측량 개선(표고 측량)",
  "description": "공공측량 중 현황측량에서 네트워크 RTK를 이용한 높이(표고) 측량 시 기존에는 최소 5개(5kmx5km 기준) 국가기준점 등에서 네트워크 RTK 측량을 통해 타원체고 산출 및 지역 지오이드고를 산정하였으나, 새로운 지오이드모델(KNGeoid24)이 개발되면서 최신의 합성 지오이드모델을 활용하여 네트워크 RTK 방식으로 높이(표고)를 실시간으로 측량 가능하도록 공공측량 작업규정 개정",
  "revisionComparison": [
    {
      "phase": "개정 전",
      "phaseEnglish": "Before Revision",
      "details": [
        "최소 5개(5kmx5km 기준) 기준점 등 필요",
        "네트워크 RTK 측량으로 타원체고 산출",
        "기준점 등 표고를 감하여 지역 지오이드고 산정"
      ]
    },
    {
      "phase": "개정 후",
      "phaseEnglish": "After Revision",
      "details": [
        "최신 합성 지오이드모델(KNGeoid24 등) 사용",
        "현황측량에서 실시간 높이(표고) 측량 가능",
        "단, 합성 지오이드모델 활용이 어려운 경우 기존 방식 적용"
      ]
    }
  ],
  "footerNote": "자세한 사항은 국토정보플랫폼(https://map.ngii.go.kr/ms/mesrInfo/geoidIntro.do)을 참고하시기 바랍니다.",
  "referenceUrl": "https://map.ngii.go.kr/ms/mesrInfo/geoidIntro.do"
};

export const MATERIAL_ABBREVIATION_DATA = {
  "documentTitle": "[ 별표 36 ] 지하시설물 제원 표기방법 및 재질약어표",
  "tables": [
    {
      "tableName": "제원표기 방법 (Specification Notation Method)",
      "data": [
        { "category": "재 질", "symbol": "재질약어표", "unit": "아래표 참조" },
        { "category": "구 경", "symbol": "∅ (원형)", "unit": "mm" },
        { "category": "구 경", "symbol": "□ (각형)", "unit": "mm" },
        { "category": "길 이", "symbol": "L", "unit": "m" },
        { "category": "깊 이", "symbol": "D", "unit": "m" }
      ]
    },
    {
      "tableName": "재질약어표 (Material Abbreviation Table)",
      "data": [
        { "abbreviation": "D.C.I.P", "originalTerm": "Ductile Cast Iron Pipe", "description": "닥타일, 주철관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "S.P.", "originalTerm": "Steel Pipe", "description": "강관", "relatedUndergroundFacilities": "상수도,가스,통신,전기" },
        { "abbreviation": "G.S.P", "originalTerm": "Galvanized Steel Pipe", "description": "아연도 강관", "relatedUndergroundFacilities": "상수도, 가스" },
        { "abbreviation": "P.V.C.", "originalTerm": "Polyvinyl Chloride Pipe", "description": "경질염화비닐관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "P.E.", "originalTerm": "Polyethylene Pipe", "description": "폴리에테렌관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "S.S.P.", "originalTerm": "Stainless Steel Pipe", "description": "스테인레스강관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "C.O.P.", "originalTerm": "Copper Pipe", "description": "동관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "P.C.", "originalTerm": "Prestressed Concrete Pipe", "description": "프리스트레스(PS), 콘크리트관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "A.C.P.", "originalTerm": "Asbestos Cement pipe", "description": "석면시멘트관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "C.I.P.", "originalTerm": "Cast Iron Pipe", "description": "회주철관", "relatedUndergroundFacilities": "상ㆍ하수도,전기,통신, 가스" },
        { "abbreviation": "L.P.", "originalTerm": "Lead Pipe", "description": "연관", "relatedUndergroundFacilities": "전기, 상수도" },
        { "abbreviation": "H.P.", "originalTerm": "Hume Pipe", "description": "흄관", "relatedUndergroundFacilities": "상ㆍ하수도,통신,전기" },
        { "abbreviation": "E.P.", "originalTerm": "Earthen ware pipe", "description": "도관(토관)", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "R.C.P.", "originalTerm": "Reinforced Concrete Pipe", "description": "철근콘트리트관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "C.I.", "originalTerm": "", "description": "주철관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "P.V.", "originalTerm": "", "description": "화학제품류관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "V.C.", "originalTerm": "Vibrated and Rolled", "description": "진동 및 전압 철근콘트리트관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "S.E.", "originalTerm": "", "description": "석축", "relatedUndergroundFacilities": "" },
        { "abbreviation": "A.C.P.", "originalTerm": "Asphalt Coating Pipe", "description": "도복장강관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "E.P.", "originalTerm": "", "description": "", "relatedUndergroundFacilities": "" },
        { "abbreviation": "G.P.", "originalTerm": "", "description": "아연도 강관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "B.R.", "originalTerm": "Bronze Pipe", "description": "청동관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "R.M.", "originalTerm": "Rubber Cable", "description": "고무몰딩", "relatedUndergroundFacilities": "전기" },
        { "abbreviation": "C.S.", "originalTerm": "Cast Steel", "description": "주강", "relatedUndergroundFacilities": "" },
        { "abbreviation": "H.D.P.E", "originalTerm": "", "description": "HDPE관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "C", "originalTerm": "", "description": "시멘트라이닝주철관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "P.E.", "originalTerm": "", "description": "수도용 PE관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "A.C.", "originalTerm": "", "description": "석면시멘트관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "P.E.P.", "originalTerm": "", "description": "폴리에틸렌분 체라이닝관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "E.P.S", "originalTerm": "", "description": "에폭시코팅강관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "HI-3P", "originalTerm": "", "description": "하이쓰리P", "relatedUndergroundFacilities": "" },
        { "abbreviation": "C.D.", "originalTerm": "", "description": "콘크리트 중선함", "relatedUndergroundFacilities": "" },
        { "abbreviation": "F.P.", "originalTerm": "Flexible Pipe", "description": "유연관, 전선관", "relatedUndergroundFacilities": "전기, 상수도" },
        { "abbreviation": "F.D.", "originalTerm": "Floor Duct", "description": "전선함", "relatedUndergroundFacilities": "전기" },
        { "abbreviation": "C.S", "originalTerm": "Carbon Steel", "description": "탄소강(카본스틸)", "relatedUndergroundFacilities": "" },
        { "abbreviation": "", "originalTerm": "", "description": "이중보은관", "relatedUndergroundFacilities": "" },
        { "abbreviation": "C.P.", "originalTerm": "Concrete Pipe", "description": "콘크리트(무근)", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "R.C.B.", "originalTerm": "Reinforced Concrete Box", "description": "철근콘크리트 박스", "relatedUndergroundFacilities": "상ㆍ하수도,전기,통신, 가스" },
        { "abbreviation": "C.P.E.", "originalTerm": "Corrugated Polyvilylene Pipe", "description": "파형합성수지관", "relatedUndergroundFacilities": "전기, 통신" },
        { "abbreviation": "P.L.P.", "originalTerm": "Polyethylene Laminated Pipe", "description": "폴리에틸렌피복강관", "relatedUndergroundFacilities": "상ㆍ하수도,전기,통신, 가스" },
        { "abbreviation": "S.T.S.", "originalTerm": "Stainless Steel Pipe", "description": "스테인레스관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "F.P.", "originalTerm": "Flexible Pipe", "description": "유연관, 전선관", "relatedUndergroundFacilities": "전기, 상수도" },
        { "abbreviation": "E.L.P.", "originalTerm": "Epoxy Lining Pipe", "description": "에폭시라이닝관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "C.I.C.", "originalTerm": "Cast Iron Lining Pipe", "description": "회주철라이닝관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "D.T.C.", "originalTerm": "Ductile Cement Lining", "description": "닥타일라이닝관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "P.C.C", "originalTerm": "Prestressde Concrete Cylinder Pipe", "description": "PC 실린더관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "V.R.", "originalTerm": "Vibrated and Rolled", "description": "진동 및 전압관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "B.E.J.", "originalTerm": "Bellows Expansion Joint", "description": "벨로우즈 신축관", "relatedUndergroundFacilities": "전기, 하수도" },
        { "abbreviation": "E.C.S.P", "originalTerm": "Epoxy Coated Steel Pipe", "description": "에폭시수지피복강관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "P.C.C.", "originalTerm": "Prestressed Concrete Cylinder Pipe", "description": "PC 실린더관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "F.R.P.", "originalTerm": "", "description": "", "relatedUndergroundFacilities": "" },
        { "abbreviation": "C.O.P.", "originalTerm": "Copper Pipe", "description": "동관", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "HI-VP", "originalTerm": "", "description": "하이 브이P", "relatedUndergroundFacilities": "상수도" },
        { "abbreviation": "C.S.P", "originalTerm": "", "description": "파형강관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "P.R.C", "originalTerm": "", "description": "불포화 폴리에스테르 수지 콘크리트관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "P.C.B", "originalTerm": "Precast Concrete Box Culvert", "description": "PC암거", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "G.R.P", "originalTerm": "Glass Reinforced Plastice Pipe", "description": "유리섬유 복합관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "P.C.F", "originalTerm": "", "description": "복합 철판관", "relatedUndergroundFacilities": "하수도" },
        { "abbreviation": "P.S.P", "originalTerm": "", "description": "고강도 철판 매입관", "relatedUndergroundFacilities": "상수도" }
      ]
    }
  ]
};

export const PUBLIC_SURVEY_REGULATIONS_DATA = {
  "documentTitle": "공공측량 작업규정",
  "parts": [
    {
      "partTitle": "제6장 지하시설물측량",
      "source": "국토지리정보원고시 제2015-2538호",
      "articles": [
        {
          "articleId": "제128조",
          "title": "정의",
          "paragraphs": [
            "이 법에서 사용하는 용어의 뜻은 다음과 같다.",
            { "term": "지하시설물(이하 '시설물'이라 한다)", "definition": "도로 및 도로부대시설물과 다음 각 목의 시설물을 말한다.", "subItems": ["가. 도로법 제2조에 따른 도로 및 부속시설물", "나. 수도법 제3조에 따른 상수관로 및 부속시설물", "다. 하수도법 제2조에 따른 하수관로 및 부속시설물", "라. 도시가스사업법 제2조에 따른 가스관로 및 부속시설물", "마. 전기통신기본법 제2조에 따른 통신관로 및 부속시설물", "바. 전기사업법 제2조에 따른 전력관로 및 부속시설물", "사. 송유관안전관리법 제2조에 따른 송유관로 및 부속시설물", "아. 집단에너지사업법 제2조에 따른 난방열관로 및 부속시설물", "자. 그 밖의 신호 및 가로등과 관련된 지하시설, 지하철 및 ITS 관련 지하시설, 지하에 설치된 케이블TV 및 유선선로, 공동구, 지하도 및 지하상가 시설 등과 같이 공공의 이해관계가 있는 지하시설물"] },
            { "term": "지하시설물측량", "definition": "시설물을 조사, 탐사하고 위치를 측량(시설물의 위치를 육안으로 확인할 수 있는 상태에서 측량하는 것을 포함한다)하여 도면 및 수치로 표현하고 데이터베이스로 구축하는 것을 말한다." },
            { "term": "지하시설물도", "definition": "지하시설물 기본도를 기초로 일정한 기호와 축척으로 표시한 도면을 말한다." },
            { "term": "조사", "definition": "시설물의 제원과 속성을 직접 현장에서 확인하는 것을 말한다." },
            { "term": "탐사", "definition": "지하에 매설된 시설물의 위치와 깊은 정도(이하 '심도'라 한다)를 탐사기기로 측정하는 것을 말한다." },
            { "index": "6", "content": "삭제" },
            { "index": "7", "content": "삭제" },
            { "term": "지하시설물 기본도(이하 '기본도'라 한다)", "definition": "지하시설물도 작성에 기초가 되는 축척 1/1,000, 1/2,500의 수치지도 또는 이미 제작된 지하시설물도를 말한다. 다만, 축척 1/1,000 수치지도와 1/2,500 수치지도가 없는 지역에는 국토지리정보원장이 간행한 수치지도 중 가장 큰 축척의 수치지도를 말한다." },
            { "term": "정위치편집", "definition": "시설물의 측량결과를 표준코드 등을 이용하여 편집하거나, 시설물에 대한 현지조사 결과를 이용하여 이미 제작된 지하시설물도를 수정·보완하는 작업을 말한다." },
            { "term": "구조화편집", "definition": "데이터 간 상호관계를 파악하기 위하여 정위치편집된 지하시설물도를 기하학적, 논리적 형태로 구성하는 작업을 말한다." },
            { "term": "도면제작편집", "definition": "지도형식의 도면으로 출력하기 위하여 정위치편집된 성과를 「지도도식규칙」 및 표준도식에 따라 편집하는 작업을 말한다." },
            { "term": "탐사불가구간(이하 '불탐'이라 한다)", "definition": "탐사가 불가능한 지역으로서 지하시설물도에 탐사불가로 명시하는 구간을 말한다." },
            "13. 이 규정에서 정하지 아니한 사항에 대하여는 「수치지도작성작업규칙」 또는 「지도도식규칙」을 적용한다.",
            { "term": "밀폐공간", "definition": "산소결핍, 유해가스로 인한 화재·폭발 등의 위험이 있는 장소로서 「산업안전보건기준에 관한 규칙」 제618조제1호에 따른 장소 중 지하시설물 측량과 관련된 것을 말한다." },
            { "term": "산소결핍", "definition": "공기 중의 산소농도가 18퍼센트 미만인 상태로서 「산업안전보건기준에 관한 규칙」 제618조제4호에서 정한 것을 말한다." },
            { "term": "유해가스", "definition": "밀폐공간에서 탄산가스·황화수소 등의 유해물질이 가스 상태로 공기 중에 발생하는 것으로서 「산업안전보건기준에 관한 규칙」 제618조제2호에서 정한 것을 말한다." },
            { "term": "적정공기", "definition": "산소농도의 범위가 18퍼센트 이상 23.5퍼센트 미만, 탄산가스의 농도가 1.5퍼센트 미만, 황화수소의 농도가 10피피엠 미만인 수준의 공기로 「산업안전보건기준에 관한 규칙」 제618조제3호에서 정한 것을 말한다." }
          ]
        },
        { "articleId": "제129조", "title": "지하시설물 종류", "content": ["삭제"] },
        { "articleId": "제130조", "title": "지하시설물측량 절차", "paragraphs": ["지하시설물측량 작업절차는 다음 각 호와 같다. 다만, 공공측량시행자의 필요에 따라 일부를 변경하거나, 생략할 수 있다.", "1. 작업계획 및 준비", "2. 조사", "3. 탐사", "4. 시설물의 위치측량", "5. 지하시설물 야장 작성", "6. 대장조서 및 속성 DB 작성", "7. 삭제", "8. 정위치편집", "9. 구조화편집", "10. 도면제작편집", "11. 성과 등의 정리"] },
        { "articleId": "제131조", "title": "지하시설물도 관리", "content": ["삭제"] },
        {
          "articleId": "제132조", "title": "시설물 측량기기",
          "content": [
            "시설물 측량에 사용되는 기기는 법 시행규칙 제102조 별표9에 따라 성능검사를 받은 장비를 사용하며, 기기의 성능기준은 다음 표와 같다.",
            { "table": { "title": "지하시설물 측량기기(탐사기기) 성능 기준", "columns": ["기기", "성능", "판독범위"], "data": [{ "기기": "금속관로 탐지기", "성능": "평면위치 20㎝, 깊이 30㎝", "판독범위": "관경 80㎜ 이상, 깊이 3m 이내의 관로를 기준으로 한 것" }, { "기기": "비금속 관로탐지기", "성능": "평면위치 20㎝, 깊이 40㎝", "판독범위": "관경 80㎜ 이상, 깊이 3m 이내의 관로를 기준으로 한 것" }, { "기기": "맨홀탐지기", "성능": "매몰된 맨홀의 탐지 50㎝ 이상", "판독범위": null }] } }
          ]
        },
        { "articleId": "제133조", "title": "안전관리책임자 지정", "content": ["지하시설물 측량작업을 수행하는 사업주는 측량기술자 중에서 각종 안전사고 예방과 안전교육을 담당하는 안전관리책임자를 지정하여 운영하여야 하며 이를 공공측량시행자에게 보고하여야 한다."] },
        { "articleId": "제133조의2", "title": "안전교육 실시", "content": ["안전관리책임자는 밀폐공간에서 작업자를 대상으로 다음 각 호의 내용을 포함하는 안전교육을 사업 착수 전 1회 이상 실시하여야 한다.", "1. 유해가스 종류, 유해·위험성", "2. 유해가스 농도 측정방법", "3. 공기호흡기 등 보호구 사용방법 및 보수점검요령", "4. 해당 작업 시 주의사항", "5. 공정별 표준작업요령", "6. 사고 발생 시 대처요령", "7. 응급처치요령", "8. 그 밖의 안전보건상 조치 등"] },
        { "articleId": "제133조의3", "title": "감시인 배치 등", "content": ["① 안전관리책임자는 작업자가 밀폐공간에서 작업을 하는 경우에 상시 작업 상황을 감시할 수 있도록 감시인을 지정하여 밀폐공간 외부에 배치하여야 한다.", "② 감시인은 밀폐공간에서 작업하는 작업자가 질식 등 이상이 있을 경우에 구조요청 등 필요한 조치를 한 후 이를 즉시 안전관리책임자에게 알려야 한다.", "③ 재해자 구조요청 후 감시인 등이 재해자 구조를 위해 밀폐공간 내로 들어갈 경우에는 반드시 호흡용보호구를 착용해야 한다. 이를 위해 반드시 호흡용보호구를 2대 이상 비치하여야 한다."] },
        { "articleId": "제133조의4", "title": "긴급 구조훈련", "content": ["사업주는 긴급 상황 발생 시 신속하게 대응할 수 있도록 작업자에게 비상연락체계 운영, 구조용 장비 사용, 송기마스크 착용 및 응급처치 등에 관한 훈련을 최초 작업 착수 전에 1회 이상 실시하고, 그 결과를 공공측량시행자에게 보고하여야 한다."] },
        { "articleId": "제133조의5", "title": "안전작업절차", "content": ["① 지하시설물 조사를 위한 밀폐공간 작업 시에는 다음 각 호의 절차에 따라 작업을 수행하여야 한다.", "1. 밀폐공간에 출입하기 전에 반드시 산소 및 유해가스농도를 측정하여 유해가스 존재유무를 확인한다.", "2. 유해가스농도 측정 후 측정결과와 환기 시간 등을 별표51의 지하시설물 안전보건 작업일지에 작성한다.", "3. 밀폐공간의 유해가스 제거 및 적정 공기 상태 유지를 위하여 환기를 한다. 다만, 공간적 특성이나 작업의 성질상 환기하기가 곤란하여 작업자에게 송기마스크 등을 지급하여 착용하도록 하는 경우에는 그러하지 아니하다.", "4. 환기 후 밀폐공간의 유해가스농도를 재측정하여 적정 공기 상태일 경우에만 출입하여야 한다.", "5. 작업자는 산소농도측정기를 휴대하고 질식사고 발생 시 용이한 구조를 위해 지상과 구명밧줄을 연결한 후 밀폐공간에 진입하여야 한다. 이때 산소농도측정기를 통해 산소결핍 여부를 수시로 확인하여야 한다.", "6. 밀폐공간 내 질식사고 예방과 차량 통제 등을 위하여 별표52의 안전작업 배치도에 따라 안전조치를 실시하여야 한다.", "② 밀폐공간에 출입하고자 할 경우에는 지하시설물 관리기관과 사전 협의하여야 한다.", "③ 시설물 관리기관은 안전대책 및 시설물과 관련된 모든 측량조건을 측량기술자에게 설명하거나 관련자를 입회시킨다.", "④ 야간작업을 할 때에는 야간 안전대책을 수립·시행한다.", "⑤ 관리기관이 시설물 측량용역을 발주하고자 할 때에는 안전관리를 위해 필요한 비용을 설계에 계상한다."] },
        { "articleId": "제133조의6", "title": "유해가스농도 측정방법", "content": ["① 밀폐공간의 유해가스농도 측정 시 산소농도, 황화수소농도, 일산화탄소농도 및 가연성가스(매탄) 측정이 모두 가능한 혼합가스농도측정기를 사용하여야 한다.", "② 유해가스 측정 시에는 반드시 밀폐공간 외부에서 흡입용 호스를 이용하여 밀폐공간의 상부, 중간, 하부의 각 지점별 농도를 측정한다."] },
        { "articleId": "제133조의7", "title": "안전장비 종류", "content": ["지하시설물 측량을 위한 밀폐공간 작업 시 구비해야 할 안전장비 종류는 별표53과 같다."] },
        { "articleId": "제133조의8", "title": "응급조치", "content": ["① 밀폐공간작업장에서는 평상시에 응급 비상연락체계가 항상 유지되어 있어야 하며, 응급 재해자가 발생하였을 때는 병원 또는 구조대에 연락함과 동시에 그 재해자가 의사의 치료를 받을 수 있기 전까지 적절한 조치를 하여야 한다.", "② 응급조치 시에는 다음 사항을 주의 깊게 관찰하고 그 내용을 의사에게 정확히 전달하여 치료에 참고하도록 하여야 한다.", "1. 호흡하고 있는지 확인하여야 한다. 호흡이 정지되어 있으면 머리를 뒤로 젖히거나 아래턱을 밀어내어 기도를 열어주고 다시 확인하여야 한다.", "2. 재해자의 체온을 유지하도록 보온하여야 한다.", "3. 재해자를 운반할 때는 서두르지 말고 재해자의 마음을 가라앉히고 되도록 상처를 건드리지 않도록 주의하여 운반하여야 한다.", "③ 구조된 재해자의 응급조치요령(심폐소생술)은 별표54와 같다."] },
        { "articleId": "제133조의9", "title": "안전이행확인서", "content": ["공공측량시행자는 지하시설물측량수행자에게 밀폐공간 출입작업에 관한 주의사항을 주지시키고 해당 용역사업 계약 시 별표55의 안전이행확인서를 제출토록 하여야 한다."] },
        { "articleId": "제134조", "title": "지하시설물도 작성시기", "content": ["시설물 관리기관은 시설물을 설치·변경한 때에는 공사가 완료되기 전 시설물이 노출된 상태에서 측량을 하여 시설물도를 작성하여야 하며, 폐기 등의 사유가 발생한 때에는 시설물도를 수정하여야 한다. (②항 삭제)"] },
        { "articleId": "제135조", "title": "지하시설물 측량 계산결과 단위", "content": ["삭제"] },
        { "articleId": "제136조", "title": "작업계획 및 준비", "content": ["① 시설물 측량을 체계적으로 하기 위해 다음 각 호의 사항이 포함된 작업계획서를 작성한다.", "1. 작업방법 및 품질관리 계획", "2. 현장답사 및 기초자료 수집 계획", "3. 세부공정표", "4. 측량기기 및 탐사장비 점검 계획", "5. 인원과 기기 투입 계획", "6. 보안 및 안전관리 계획", "② 시설물을 측량하기 전 다음 각 호의 사항을 미리 갖추어 놓고 필요한 자료를 조사(이하 이 조에서 '기초조사'라 한다) 또는 수집한다.", "1. 토지 및 건물 출입증", "2. 조사 및 탐사에 필요한 안전기기", "3. 기준점성과, 기본도 등의 각종 측량성과", "4. 도로의 노선번호, 포장재질 등과 도로시설물 관리대장 등의 기초자료", "5. 관로의 재질, 관경 및 설치연도 등의 자료", "6. 시설물 특성 및 성질 등의 속성정보", "7. 시설물의 위치에 관한 자료 및 도면", "8. 시설물 관리대장 및 조서", "9. 시공당시 설계도면 또는 준공측량도면", "10. 기타 시설물 측량에 필요한 자료", "③ 기초조사 또는 수집한 자료를 이용하여 다음 각 호와 같이 지하시설물 편집도를 작성하고 조사·탐사 및 측량에 활용한다.", "1. 편집도의 축척은 기본도 축척과 동일하게 하고 도지의 재질, 두께 및 규격은 정해진 기준에 따른다.", "2. 편집도는 축척 1/1,000, 1/2,500의 수치지도를 5백분의 1로 확대·출력한 도면을 원칙으로 한다. 다만, 축척 1/1,000의 수치지도와 1/2,500의 수치지도가 없는 지역에 대해서는 국토지리정보원장이 간행한 수치지도 중 가장 큰 축척의 수치지도를 사용할 수 있다.", "3. 휴대용 정보기기를 이용할 경우에는 별도의 출력을 하지 않고 저장된 수치지도를 편집도로 사용할 수 있으며, 이 경우 편집도의 정확도는 제37조를 준용한다.", "4. 편집도의 정리 및 작성은 별표46의 시설물 제원표기방법 및 재질약어표에 따른다."] },
        { "articleId": "제137조", "title": "지하시설물 기도", "content": ["삭제"] },
        { "articleId": "제138조", "title": "시설물 조사, 탐사 대상 및 범위", "content": ["① 시설물 조사 및 탐사 대상은 다음 각 호와 같다. 다만, 이 규정에서 정하는 것을 제외하고는 시설물 관리기관별로 따로 정할 수 있다.", "1. 폭이 4m 이상인 도로 및 도로부대시설물", "2. 관경이 50㎜ 이상인 상수관로 및 부속시설물", "3. 관경이 200㎜ 이상인 하수관로 및 부속시설물", "4. 관경이 50㎜ 이상인 가스관로 및 부속시설물", "5. 관경이 50㎜ 이상인 통신관로 및 부속시설물", "6. 관경이 100㎜ 이상인 전기관로 및 부속시설물", "7. 모든 송유관", "8. 모든 난방열관", "② 조사 및 탐사 범위는 별표 45와 같으며, 「지방자치단체의 도로 및 상·하수도의 시설물관리를 위한 범용프로그램의 기본설계서 및 품질인증기준」과 「도로기반시설물정보 통합관리에 관한 지침」을 준용하며, 이 규정에서 정하는 것을 제외하고는 시설물관리기관별로 정할 수 있다."] },
        { "articleId": "제139조", "title": "조사", "content": ["① 시설물을 탐사, 측량하기 전에 시설물편집도를 이용하여 육안으로 확인이 가능한 지상시설물의 명칭 및 제원 등 속성자료를 조사한다.", "② 조사는 다음 각 호와 같이 실시한다.", "1. 현지조사는 조사시점을 기준으로 하여 노출된 지상부분시설물은 모두 조사하고 지하부문 시설물은 입력기준에서 정한 사항을 조사한다.", "2. 시설물을 조사할 때에는 맨홀 등의 뚜껑을 열고 그 속성을 조사한다.", "3. 조사한 자료는 출력도면 및 수치도면에 표시하고 측량도면에 정리한다.", "4. 이 규정에서 정하지 아니한 사항에 대하여는 공공측량 시행자가 정한 것을 추가 조사할 수 있다.", "③ 기본도상의 지형·지물이 실제 지형·지물과 현저히 달라 정확도를 유지할 수 없을 때에는 도로 선형 또는 기준이 될 수 있는 지형·지물을 선정하여 시설물에 대한 현지보완측량(판독곤란 또는 도화가 불가능한 지형·지물과 사진촬영 후 변화가 생긴 지역을 현지에서 조사 측량하는 것을 말한다)을 실시하여야 한다.", "④ 조사 및 현지보완측량 결과를 기본도에 추가 편집하여 시설물 측량에 이용할 수 있도록 한다."] },
        { "articleId": "제140조", "title": "탐사", "content": ["① 삭제", "② 여러 종류의 시설물을 동시에 탐사할 경우에는 종류별로 구분하여 탐사한다.", "③ 금속관로, 비금속관로 및 케이블 등 시설물의 재질에 따라 적합한 시설물 탐사방법을 선택한다.", "④ 시설물의 평면위치는 관로 중심선을 기준으로 하며, 깊이는 지표면에서 시설물의 상단까지로 한다.", "⑤ 도로 중심선을 기준으로 가로로 매설되어 있는 시설물을 탐사할 경우에는 가로방향 탐사기기 등을 이용하여 탐사할 수도 있다.", "⑥ 시설물에 대한 탐사간격은 20m 이하로 한다. 다만, 다음 각 호에 해당하는 경우에는 간격에 관계없이 반드시 탐사를 실시한다.", "1. 지하시설물이 교차·분기하거나 상태가 바뀌는 경우", "2. 지하시설물이 곡선구간인 경우", "3. 지하시설물에 각종 제어장치 또는 밸브가 있는 경우", "4. 제3호에 따라 맨홀 및 변실을 조사할 때에는 관로의 재질, 지름 및 설치연도 등의 자료(속성자료)에 대한 직접 또는 자료조사를 병행한다.", "⑦ 시설물 탐사 오차의 허용 범위는 다음 각 호와 같다.", "1. 금속관로의 경우 매설깊이가 3.0m 이하인 경우에는 평면위치 ±20㎝, 깊이 ±30㎝ 이내로 하며, 3.0m를 초과하는 경우에는 별도로 정할 수 있다.", "2. 비금속관로의 경우 매설깊이가 3.0m 이하인 경우는 평면위치 ±20㎝, 깊이 ±40㎝ 이내로 하며, 3.0m를 초과하는 경우에는 별도로 정하여 사용할 수 있다.", "3. 확인 굴착의 경우는 지상측량의 정확도를 준용한다.", "4. 직경이 100㎜ 이하인 비금속관로에 대하여는 시설물 관리기관별로 따로 정할 수 있다.", "⑧ 시설물 위치 탐사가 가능하도록 보조장치(리드선 등)가 설치된 비금속관로를 보조장치를 이용하여 탐사한 경우에는 해당 비금속관로를 금속관로로 본다.", "⑨ 확인 굴착의 경우는 이를 실측성과로 본다."] },
        { "articleId": "제141조", "title": "지하시설물별 기본탐사 대상", "content": ["삭제"] },
        { "articleId": "제142조", "title": "지하시설물의 위치측량", "content": ["① 신규로 매설되는 시설물의 위치는 다음 각 호의 방법으로 측량한다.", "1. 시설물 공사가 완료된 후, 굴착된 땅을 되메우기 전에 스타프 및 스틸자 등을 이용하여 지거측량 기준점(C)를 중심으로 매설관로의 이격거리(a) 및 깊이(b)를 실측한다.", "2. 실측 간격은 20m를 기준으로 하되, 관의 곡선부분 및 관종·관경의 변경 등 특이사항이 있을 경우에는 별도 측정하고 사진촬영(근경, 원경)을 한다.", "3. 사진촬영은 되메우기 전 지거측량 실측장면(깊이 및 보차도 경계석에서의 이격거리 등)과 지거측량 기준점 또는 표식 등을 다른 측량작업자가 알아볼 수 있도록 촬영(근경, 원경)한다.", "4. 지거측량 기준점(C)은 측량기준점을 활용하거나 없을 경우 GNSS 측량 등을 통해 지점 좌표(X, Y, Z)를 취득한다.", "5. 공공기준점에서 토털스테이션 또는 GNSS 측량기기 등을 이용하여 측점(C.0, C.1, ... , C.n) 또는 측점(D.0, D.1, ... , D.n)을 절대측량하여 측점별 좌표((X0, Y0, Z0)～(Xn, Yn, Zn))를 취득한다.", "6. 촬영한 사진은 별표 56의 노출관로 위치측량 조서에 정리한다.", "② 이미 설치된 시설물의 위치측량은 조사 및 탐사된 지점만을 대상으로 한다.", "③ 지하시설물 위치측량 정확도는 10㎝ 이내를 허용오차로 하며, 높이 및 좌표 등의 단위는 m로 하고, 소수 둘째자리까지 한다.", "④ 지형·지물을 기준으로 시설물을 측량할 경우 반드시 측량의 기준이 되는 지형·지물에 대한 상세한 점의 기록을 작성하여야 하며, 기준이 되는 지형·지물에서 이격거리(인도 경계석이 도로와 접한 면으로부터 수직이격거리를 말한다)에 의하여 측량할 수 있다.", "⑤ 기준점을 이용한 시설물 측량은 다음 각 호의 방법으로 한다.", "1. 측량기준점을 이용하여 일정거리 또는 도엽별로 기준점표지(X, Y, Z)를 설치한다.", "2. 기준점표지는 제2편에서 정한 측량방법에 따라 설치하고, 기준점표지를 기준으로 시설물의 주요관로 및 맨홀 등의 위치를 측정한다.", "⑥ 지하시설물 기본도를 이용하여 지표면상의 표고를 측정하기 어려울 경우에는 지점마다 지표면의 표고에 대하여 별도의 수준측량을 할 수 있다. 이 경우 수준 측량은 직접 또는 간접측량 방식으로 한다.", "⑦ 도로 재포장 등에 따라 시설물의 심도가 변할 경우 이를 수정하여야 한다.", "⑧ 지하시설물의 허용오차는 탐사기기 오차와 위치측량 오차를 포함한다."] },
        { "articleId": "제143조", "title": "지하시설물 원도 작성", "content": ["삭제"] },
        { "articleId": "제144조", "title": "대장조서 및 속성DB 작성", "content": ["① 삭제", "② 탐사가 완료되면 다음 각 호와 같은 내용을 대장조서에 기재한다.", "1. 작업일자", "2. 작업내용", "3. 사용기기", "4. 작업방법", "5. 작업자의 인적사항", "6. 탐사기기 성능 범위를 초과하는 등 시설물을 탐사하는 것이 기술적으로 곤란한 경우 그 지역의 위치와 사유", "③ 자료수집과 현지조사 및 탐사를 통하여 수집한 속성자료와 관계 법령에 따라 작성한 지하시설물 관리대장 항목 중 필요한 사항을 입력한다. 이 경우, 속성자료는 도형자료와 서로 연결될 수 있도록 입력한다."] },
        { "articleId": "제145조", "title": "지하시설물도 작성", "content": ["삭제"] },
        { "articleId": "제146조", "title": "지하시설물의 표현방법", "content": ["삭제"] },
        { "articleId": "제147조", "title": "지하시설물 입력", "content": ["삭제"] },
        {
          "articleId": "제148조", "title": "지하시설물 정위치 편집",
          "content": [
            "① 정위치편집은 다음 각 호와 같이 실시한다.",
            "1. 정위치편집 작업은 도엽 단위로 하고 표준코드 및 심볼을 사용한다.",
            "2. 시설물의 레이어코드 및 속성코드는 「수치지형도작성작업규정」 별표1 및 국가공간정보 표준을 준수한다.",
            "3. 지하시설물 관로 입력은 관 속 내용물이 흐르는 방향으로 입력하는 것을 원칙으로 하고, 파악할 수 없는 경우 도면의 상단에서 하단, 좌측에서 우측 방향 순서로 입력한다.",
            "4. 관로를 입력할 때에는 시설물의 맨홀, 제수변, 밸브 등을 기준으로 해서 관로를 분리하여 입력하며, 점형자료의 중앙에서 관로를 끊어준다.",
            "5. 관로의 위치정보 및 속성정보가 달라지거나 분기 또는 합쳐지는 등 다음 각 목에 해당하는 경우는 반드시 접합점(NODE)을 생성한다.",
            { "type": "sublist-alpha", "items": ["가. 지하시설물의 관경 또는 재질 등 속성자료가 변경되는 지점", "나. 시설물이 교차·분리되거나 상태가 바뀌는 지점", "다. 지하시설물에 각종 제어장치 또는 밸브가 있는 지점", "라. 그 밖에 시설물 관리상 필요하다고 판단되는 지점"] },
            "6. 관로가 횡단할 경우에는 분리기호를 교차점에 별도로 표시하고, 통과하도록 입력한다.",
            "7. 맨홀 및 심볼 등이 중복될 경우에는 중복하여 입력한다.",
            "8. 관로가 변류 및 제어기 등과 만날 경우에는 관로 위의 접합부에 심벌을 부여한다. 이 경우 심벌입력은 관로 방향과 동일한 방향으로 입력한다.",
            "9. 정위치편집이 완료되면 시설물을 정위치편집한 파일은 별도 작성하여 보관한다.",
            "10. 하수 관로의 시·종점 및 실측 지점마다 관로 상단의 절대높이 값(Z)을 입력한다.",
            "② 정위치편집한 도면에 표시하는 시설물의 종류별 기본색상은 다음 각 호와 같다.",
            { "type": "color-codes", "items": [{ "facility": "도로 시설", "color": "「수치지도작성작업규칙」 또는 「지도도식규칙」 적용" }, { "facility": "상수도 시설", "color": "청색 (0,0,255)" }, { "facility": "하수도 시설", "color": "보라색 (255,0,255)" }, { "facility": "가스시설", "color": "황색 (255,102,0)" }, { "facility": "통신시설", "color": "녹색 (0,255,0)" }, { "facility": "전기시설", "color": "적색 (255,0,0)" }, { "facility": "송유관 시설", "color": "갈색 (153,102,0)" }, { "facility": "난방열관 시설", "color": "주황색 (255,102,204)" }] },
            "③ 시설물의 제원은 다음 각 호와 같이 표기한다.",
            "1. 매설물의 연장은 맨홀과 맨홀 사이의 거리를 기록하는 것을 원칙으로 하되, 분기점, 관경의 변화점, 매설연도의 상이점 등을 적용하여 기입할 수 있다.",
            "2. 두 개 이상의 동일 공종관이 서로 교차하여 합류될 경우에는 합류와 같이 표시하며, 분리될 경우에는 분리기호(심볼)를 교차점에 별도로 표시하고, 상월, 하월로 구분한다.",
            "3. 같은 지점에 동일 공종으로 각기 다른 2개 이상의 재질, 규격의 시설물이 매설되어 있을 경우에는 한 선분 위에 그 제원을 2줄 이상으로 각각 기입한다.",
            "4. 동일한 제원으로 맨홀과 맨홀 사이의 거리가 협소할 경우에는 기록 제원 중 연장만 표시한다.",
            "5. 하수시설의 경우 유수방향을 관의 연결부나 끝부분 및 접합점에 ‘→’와 같이 화살표로 표시한다.",
            "6. 각 제원의 표시 방법은 다음 각 목과 같다.",
            { "type": "sublist-alpha", "items": ["가. 매설연도는 연도(예 : 1991)만 표시한다.", "나. 재질은 약어표에 따라 작성한다.", "다. 관경은 원형, 각형 구분으로 구분하고 공칭 지름을 ㎜단위로 작성한다.", "라. 연장은 m단위로 소수 둘째자리에서 반올림한다.", "마. 매설깊이는 지하시설물 상단의 거리를 m단위로 소수 둘째자리에서 반올림한다.", "바. 관로수량은 규격별 수량(예 : ∅200×6)을 기입한다.", "사. 1991년에 매설한 흄관 원형 구경 500㎜, 연장 25m, 지하시설물 상단의 매설깊이 1.2m인 경우, '1991/HP/∅500/L25/D1.2'와 같이 표기한다.", "아. 박스 구조물은 「연수＠폭×높이」로 표기하고, m단위로 소수 첫째자리까지 표기한다.", "자. 도로폭은 m단위로 소수 둘째자리에서 반올림한다."] },
            "7. 특수한 지하시설물은 다음 각 목과 같이 표기한다.",
            { "type": "sublist-alpha", "items": ["가. R.C BOX(하수), 공동구, 체신구, 그 밖의 대형 지하시설물의 평면도 표시방법은 그 구조물의 높이에 관계없이 폭이 1.5m 이상일 경우에는 실선으로 표시하고 규격은 폭×높이로 기록(예: 1988/RC BOX/1.5×1.5/L100/D1.5)하며, 다른 사항은 제3항의 제원표시방법을 따른다.", "나. 하천 복개 구조물도 R.C BOX와 같이 표시하고, 측벽이 수직이 아닌 경우 그 폭은 상부 슬랩(Slab) 폭으로 기록한다.", "다. 원형관의 관경이 1,500㎜ 이상일 경우에는 내경을 실제 폭으로 표시한다."] },
            "④ 도로시설물의 제원 표기방법은 다음과 같다.",
            "1. 도로시설물은 형태적 특성에 따라 점형, 선형, 면형으로 분류하고 각각의 재원 조사 및 표기는 국가공간정보 표준을 준수한다.",
            "2. 점형시설물인 가로수의 제원 표시 예시는 다음과 같다. 가. 수종(예 : 느티나무)을 표시한다. 나. 직경은 m단위로 소수 둘째자리에서 반올림한다. 다. 수목보호판 유무(예 : 보호판 유)를 표시한다. 라. 지주대유무(예 : 지주대 유)를 표시한다. (예시: 느티나무/흉20/보호판 유/지주대 유)",
            "3. 선형시설물인 방호울타리의 제원은 다음 각 목과 같이 표시한다. 가. 방호울타리종류(예 : 가드레일)를 표시한다. 나. 재질(예 : 스테인리스)을 표시한다. 다. 높이는 m단위로 소수 둘째자리에서 반올림한다. (예시: 가드레일/스테인레스/H=1.0)",
            "4. 면형시설물인 중앙분리대는 다음 각 목과 같이 표시한다. 가. 분리대종류(예 : 녹지대)를 표시한다. 나. 폭원과 높이를 m단위로 소수 둘째자리에서 반올림한다. (예시: 녹지대/B=0.5/H=0.9)"
          ]
        },
        { "articleId": "제149조", "title": "지하시설물도 입력", "content": ["삭제"] },
        { "articleId": "제150조", "title": "정위치 편집 정확도", "content": ["삭제"] },
        { "articleId": "제151조", "title": "구조화편집", "content": ["① 데이터 간 상관관계를 파악하기 위하여 정위치편집된 시설물을 기하학적인 형태로 구성한다.", "② 구조화편집은 다음 각 호에 따라 실시한다.", "1. 구조화편집은 정위치편집된 시설물의 필요한 대상을 점, 선, 면 및 네트워크 영역분할의 모델 또는 이를 조합한 기하모델로 편집하며, 이것에 관한 설명서를 작성한다.", "2. 정위치편집 파일에 있는 자료가 충분하지 않은 경우에는 다른 점과 선을 이용하여 이를 보완한다.", "3. 인접도면 접합은 관로, 관경 및 심도, 도로노선 등 전반적인 도형을 편집기기로 확인한다.", "4. 구조화편집이 완료되면 데이터를 기록매체에 수록하여 구조화편집 파일로 보관한다."] },
        { "articleId": "제152조", "title": "도면제작편집", "content": ["도면제작편집은 지도형식으로 출력하기 위하여 정위치편집된 성과를 「지도도식규칙」 및 표준도식에 따라 편집한다."] },
        { "articleId": "제153조", "title": "성과 등의 정리", "content": ["① 시설물을 작성하고자 하는 자는 관련 자료를 효율적으로 이용하여 시설물에 대한 측량 작업이 원활하게 완료될 수 있도록 성과를 정리한다.", "② 시설물 측량 성과 등은 다음과 같다.", "1. 시설물 측량 성과: 가. 수집한 관련자료, 나. 현지보완측량을 하는 경우 보완측량의 성과, 다. 조사결과를 정리한 도면, 라. 측량성과, 마. 작업조서, 바. 그 밖의 자료", "2. 시설물 작성의 성과: 가. 정위치편집 파일, 나. 구조화편집 파일 및 이에 관한 설명서, 다. 성과관리 및 점검파일, 라. 기타자료", "③ 시설물 측량에 대한 목록정보는 「국가공간정보 기본법」제23조제1항에 따라 작성한다."] },
        { "articleId": "제154조", "title": null, "content": ["삭제"] }
      ]
    },
    {
      "partTitle": "제6편 네트워크 RTK 측량",
      "source": "국토지리정보원고시 제2015-2538호",
      "articles": [
        { "articleId": "제165조", "title": "네트워크 RTK 측량", "content": ["\"네트워크 RTK 측량\"이란 법 제7조 및 같은 법 시행령 제8조에 따른 국가기준점 중 위성기준점을 이용하여 국토지리정보원에서 운영하고 있는 실시간 정밀GNSS 측량 방법으로 공공기준점 및 각종 현황을 측량하는 작업을 말한다."] },
        { "articleId": "제166조", "title": "정의", "intro": "이 측량에서 사용하는 용어의 뜻은 다음과 같다.", "definitions": [{ "term": "네트워크 RTK 측량", "definition": "3점 이상의 고정점(국토지리정보원에서 운영 중인 상시관측소)에서 관측한 자료를 이용하여 계산한 보정정보와 이동점에 설치한 GNSS 수신기에서 관측한 자료를 이용하여 즉시 기선해석을 실시함으로써 이동점의 위치를 결정하는 작업(이하 \"네트워크 RTK\"라 한다)을 말한다." }, { "term": "1 epoch", "definition": "GNSS 반송파 위상신호를 고정점과 이동점에서 동시에 관측되는 1회의 신호를 말한다." }, { "term": "세션", "definition": "네트워크 RTK 수신기를 이용하여 한 점의 좌표값을 결정하기 위해 수행하는 관측 단위를 말한다." }] },
        { "articleId": "제167조", "title": "운용방식", "intro": "네트워크 RTK 측량은 다음의 순서를 따른다.", "steps": ["1. 이동점에 설치한 GNSS 수신기로 GNSS 위성신호를 수신한다.", "2. 이동점의 대략적인 위치를 이동통신망을 이용하여 네트워크 RTK 서버로 전송한다.", "3. 네트워크 RTK 서버는 이동점 근처 가상의 기준점(이하 \"가상기준점\"이라 한다)을 생성하고 그 위치에서의 보정정보를 산출하여 이동통신망을 통해 이동점에 송신한다.", "4. 이동점의 관측자료와 가상기준점에 대한 보정정보를 이용하여 즉시 기선해석을 실시하여 이동점의 위치를 결정한다."] },
        { "articleId": "제168조", "title": "적용", "paragraphs": [{ "index": "①", "text": "이 규정은 3급, 4급 공공삼각점측량에 적용한다." }, { "index": "②", "text": "단, 공공수준점측량(표고)에는 적용할 수 없다." }, { "index": "③", "text": "이 규정은 다음 각 호의 현황측량에 적용한다.", "subItems": ["1. 지상현황측량", "2. 노선측량", "3. 하천 및 연안측량", "4. 용지측량", "5. 토지구획정리측량", "6. 지하시설물측량"] }, { "index": "④", "text": "현황측량에서 네트워크 RTK를 이용한 높이(표고) 측량 시 다음 방법을 적용한다.", "subItems": ["1. 작업지역에 균등하게 분포하는 최소 5개(5㎢x5㎢ 기준)의 수준점에서 네트워크 RTK 측량을 통한 타원체고를 산출한다.", "2. 산출된 타원체고에서 수준점의 표고를 감산하여 각 지점에서의 기하학적 지역 지오이드고를 산정한다.", "3. 이동점에서의 높이는 위에서 산정한 5개 지점에서의 지오이드고에서 내삽한 지오이드고를 이용하여 타원체고에서 감산함으로써 결정한다."] }] }
      ]
    }
  ]
};
