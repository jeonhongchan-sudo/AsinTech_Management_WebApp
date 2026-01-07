// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, showAlert } from './core.js';
import { initPdfViewer, selectGuideline, changePage, zoomIn, zoomOut, toggleFullScreen, toggleSidebar, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, toggleLayerPanel, toggleBackgroundMap, toggleMarkers } from './viewers.js';
import { loadProjects, createProject, deleteProject, renameProject, exportCSV, openPhotoManager, closePhotoManager, toggleViewMode, deletePhoto, renamePhoto, setupDragDrop, handleFiles, uploadPhotos, backToProjectFromUpload, triggerUploadForCurrent, openLightbox, closeLightbox, navigateLightbox } from './managers.js';

// 전역 함수 바인딩 (HTML onclick 속성 지원용)
window.switchTab = switchTab;
window.createProject = createProject;
window.deleteProject = deleteProject;
window.renameProject = renameProject;
window.exportCSV = exportCSV;
window.openPhotoManager = openPhotoManager;
window.closePhotoManager = closePhotoManager;
window.toggleViewMode = toggleViewMode;
window.deletePhoto = deletePhoto;
window.renamePhoto = renamePhoto;
window.handleFiles = handleFiles;
window.uploadPhotos = uploadPhotos;
window.backToProjectFromUpload = backToProjectFromUpload;
window.triggerUploadForCurrent = triggerUploadForCurrent;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;
window.selectGuideline = selectGuideline;
window.changePage = changePage;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.toggleFullScreen = toggleFullScreen;
window.toggleSidebar = toggleSidebar;
window.loadCadMap = loadCadMap;
window.toggleLayer = toggleLayer;
window.changeLayerColor = changeLayerColor;
window.toggleLayerPanel = toggleLayerPanel;
window.toggleBackgroundMap = toggleBackgroundMap;
window.toggleMarkers = toggleMarkers;

// 탭 전환 로직
export function switchTab(tabName) {
  if (tabName !== 'photo-manager') document.getElementById('photo-manager-interface').style.display = 'none';
  if (tabName === 'cadViewer') initCadViewer(); else cleanupCadViewer();
  
  document.getElementById('mainTabs').style.display = 'flex';
  state.currentProjectId = null;

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick="switchTab('${tabName}')"]`)?.classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = ''; });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  if (tabName === 'guidelines') {
    const uis = document.getElementById('uisCodeTableContainer');
    const rtk = document.getElementById('networkRtkContainer');
    if (uis.style.display !== 'block' && rtk.style.display !== 'block') selectGuideline('road');
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('photo-manager-interface').style.display = 'none';
  initPdfViewer();
  initProj4Defs();
  initCadViewer(); // 초기 탭(Map Viewer) 초기화

  callApi('getSupabaseConfig').then(res => {
      if (res.success && res.url && res.key) {
          state.supabaseConfig = { url: res.url, key: res.key, vworldKey: res.vworldKey, colabUrl: res.colabUrl };
          console.log("Supabase Config Loaded");
      }
      loadProjects();
  }).catch(e => { console.warn("Config fetch failed", e); loadProjects(); });

  setupDragDrop();
  
  // PDF 초기화 (road)
  if(typeof pdfjsLib !== 'undefined') selectGuideline('road');

  document.addEventListener('keydown', function(event) {
    if (document.getElementById('lightboxOverlay').style.display === 'flex') {
        if (event.key === 'ArrowLeft') navigateLightbox(-1);
        if (event.key === 'ArrowRight') navigateLightbox(1);
        if (event.key === 'Escape') closeLightbox();
    }
  });
});

function initProj4Defs() {
    if (typeof proj4 === 'undefined') return;
    proj4.defs("EPSG:5179", "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    if (typeof ol !== 'undefined' && ol.proj && ol.proj.proj4 && ol.proj.proj4.register) ol.proj.proj4.register(proj4);
}
