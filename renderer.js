// 显示版本信息
const infoDiv = document.getElementById('info');
if (infoDiv && window.electron) {
  infoDiv.innerHTML = `
    <p><strong>Node 版本:</strong> ${window.electron.versions.node()}</p>
    <p><strong>Chrome 版本:</strong> ${window.electron.versions.chrome()}</p>
    <p><strong>Electron 版本:</strong> ${window.electron.versions.electron()}</p>
  `;
}
