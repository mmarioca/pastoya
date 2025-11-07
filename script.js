// Inicializar jsPDF
const { jsPDF } = window.jspdf;

let currentStep = 1;
let formData = {};

// ==================== NAVEGACIÓN ====================
function nextStep(next) {
    if (!validateStep(currentStep)) return;
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.getElementById(`step-${next}`).classList.add('active');
    currentStep = next;
    window.scrollTo(0, 0);
}

function validateStep(step) {
    if (step === 1) return true;
    let isValid = true;
    const stepEl = document.getElementById(`step-${step}`);
    stepEl.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]').forEach(input => {
        if (input.value.trim() === '') {
            isValid = false; input.style.borderColor = '#e74c3c';
        } else {
            input.style.borderColor = 'transparent';
        }
    });
    const radioGroups = new Set();
    stepEl.querySelectorAll('input[type="radio"]').forEach(radio => radioGroups.add(radio.name));
    radioGroups.forEach(name => {
        if (!stepEl.querySelector(`input[name="${name}"]:checked`)) isValid = false;
    });
    return isValid;
}

// ==================== PROCESO FINAL ====================
async function finalizeForm() {
    if (!validateStep(7)) {
        alert("Por favor completa tu nombre y WhatsApp."); return;
    }

    const form = document.getElementById('wizardForm');
    const data = new FormData(form);
    formData = {};
    data.forEach((value, key) => formData[key] = value);

    const btn = document.querySelector('#step-7 .btn-next');
    const originalText = btn.innerText;
    // Indicamos que la IA está pensando
    btn.innerText = "Analizando con IA... 🧠";
    btn.disabled = true;

    try {
       
        const recomendacionAI = await obtenerRecomendacionREAL(formData);
        
     
        btn.innerText = "Generando PDF... 📄";
        await generatePDF(formData, recomendacionAI);

       
        document.getElementById(`step-7`).classList.remove('active');
        document.getElementById(`step-final`).classList.add('active');

    } catch (error) {
        console.error("Error:", error);
        alert("Ocurrió un error técnico. Por favor revisa tu conexión o intenta más tarde.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ==================== INTELIGENCIA ARTIFICIAL (VÍA BACKEND CLOUDFLARE) ====================
async function obtenerRecomendacionREAL(data) {
    try {
        
        const response = await fetch('/pasture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
           
            throw new Error(`Error del Backend: ${response.status}`);
        }
        
        const json = await response.json();
        
        return json.choices[0].message.content;

    } catch (error) {
        console.error("Fallo en IA:", error);
        return "Estimado productor, por una intermitencia técnica momentánea no pudimos generar la recomendación automática. Un asesor humano le contactará a la brevedad.";
    }
}

// ==================== GENERACIÓN PDF (V3 Final) ====================
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
    });
}

async function generatePDF(data, recomendacionText) {
    const doc = new jsPDF();
    const C_GREEN = [94, 126, 62];
    const C_DARK = [60, 60, 60];
    const C_LIGHT = [120, 120, 120];
    const C_BG = [245, 247, 245];

    let y = 20;

    // HEADER
    try {
        const logo = await loadImage('images/semillas_sudamerica.png');
        doc.addImage(logo, 'PNG', 15, 10, 40, 0);
    } catch (e) {
        doc.setTextColor(...C_GREEN); doc.setFontSize(16); doc.text("GRUPO SUDAMÉRICA", 15, 25);
    }
    doc.setTextColor(...C_GREEN);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("REPORTE TÉCNICO", 195, 22, { align: "right" });
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text("RECOMENDACIÓN DE PASTURAS", 195, 29, { align: "right" });
    doc.setDrawColor(...C_GREEN); doc.setLineWidth(0.5); doc.line(15, 38, 195, 38);

    // INFO PRODUCTOR
    y = 55;
    doc.setTextColor(...C_GREEN); doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DEL PRODUCTOR", 15, y);
    y += 5;
    doc.setFillColor(...C_BG); doc.setDrawColor(230, 230, 230);
    doc.roundedRect(15, y, 180, 55, 3, 3, 'F');
    
    y += 12; doc.setFontSize(10);
    function addData(lbl, val, x, yp) {
        doc.setFillColor(...C_GREEN); doc.circle(x-4, yp-1, 1.5, 'F');
        doc.setFont("helvetica", "bold"); doc.setTextColor(...C_DARK); doc.text(lbl, x, yp);
        doc.setFont("helvetica", "normal"); doc.text((val||'-').toString(), x+32, yp);
    }
    addData("Nombre:", data.nombre, 25, y); addData("Suelo:", data.suelo, 115, y);
    addData("Ubicación:", data.ciudad, 25, y+12); addData("Inundable:", data.inundable, 115, y+12);
    addData("Actividad:", data.actividad, 25, y+24); addData("Uso Pasto:", data.uso_pasto, 115, y+24);
    addData("Ganadería:", data.tipo_ganaderia, 25, y+36); addData("Carga:", `${data.carga_animal} cab/ha`, 115, y+36);

    // RECOMENDACIÓN
    y += 65;
    doc.setDrawColor(...C_GREEN); doc.setLineWidth(0.3); doc.setFillColor(252, 253, 252);
    doc.roundedRect(15, y, 180, 115, 2, 2, 'FD');
    y += 15;
    doc.setFillColor(...C_GREEN); doc.rect(25, y-4, 4, 4, 'F');
    doc.setTextColor(...C_GREEN); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("PLAN DE SIEMBRA RECOMENDADO", 32, y);
    doc.setDrawColor(220, 220, 220); doc.line(25, y+6, 185, y+6);
    y += 15;
    doc.setTextColor(...C_DARK); doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(recomendacionText, 160), 25, y);

    // FOOTER
    const fy = 278;
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.5); doc.line(15, fy-12, 195, fy-12);
    doc.setFontSize(8); doc.setTextColor(...C_LIGHT);
    doc.setFont("helvetica", "bold"); doc.text("GRUPO SUDAMÉRICA", 105, fy-7, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Jorge Casaccia e/ Tte. Herrero y Natalicio Talavera | Pedro Juan Caballero, Py", 105, fy-3, { align: "center" });
    doc.text("Tel: (0336) 275 806 | Email: sac@semillassudamerica.com | www.gruposudamerica.com", 105, fy+2, { align: "center" });

    doc.save(`Recomendacion_GS_${(data.nombre||'Cliente').replace(/\s+/g,'').substring(0,10)}.pdf`);
}