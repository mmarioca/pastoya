// _worker.js (VERSIÓN CORREGIDA - ANTI-RECUSIÓN)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // === RUTA ESPECÍFICA: /pasture (POST SOLO) ===
    if (url.pathname === '/pasture' && request.method === 'POST') {
      return await handlePasture(request, env);
    }

    // === PARA TODO LO DEMÁS: SIRVE ARCHIVOS ESTÁTICOS SIN RECURSION ===
    // Usa el método seguro para Pages: no llama al Worker de nuevo
    return new Response(await env.ASSETS.fetch(request).then(r => r.text()), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

async function handlePasture(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response('Error leyendo JSON', { status: 400 });
  }

  const systemPrompt = `
Eres un ingeniero agrónomo experto de Grupo Sudamérica.
CATÁLOGO Y DENSIDAD (Kg/ha):
- LÍNEA COMPLETA (Convencional=5kg, TOP S=7kg, SuperSuda=10kg): Marandu, Piatã, Xaraés (MG-5), Paiaguás, Basilisk, Ruziziensis.
- LÍNEA TECNOLÓGICA (TOP S=7kg, SuperSuda=10kg): Mombaça, Zuri, Miyagui, Massai, Tamani, Humidicola, Llanero.
REGLAS TÉCNICAS ESTRICTAS (¡SÍGUELAS!):
1. SUELO ARENOSO/POBRE: RECOMENDAR SIEMPRE Marandu, Piatã o Basilisk.
2. SUELO INUNDABLE: RECOMENDAR SIEMPRE Humidicola o Llanero.
3. ENGORDE INTENSIVO (Suelo Bueno): Recomendar Zuri, Mombaça, Miyagui.
4. CABALLOS: Única opción es Massai.
TU ESTRUCTURA DE RESPUESTA OBLIGATORIA:
Hola ${data.nombre || 'Productor'}, gracias por confiar en Grupo Sudamérica. Basado en sus datos, este es su plan de siembra ideal:
OPCIÓN PRINCIPAL: [NOMBRE] (Formato [TIPO] - [DENSIDAD]kg/ha)
Justificación: [Explica técnicamente por qué se adapta a SU suelo y ganadería].
OPCIÓN SECUNDARIA: [NOMBRE] (Formato [TIPO] - [DENSIDAD]kg/ha)
Justificación: [Breve explicación de esta alternativa].
Para concretar su pedido y asegurar disponibilidad, por favor responda a este contacto o llame a su asesor comercial asignado.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `ANALIZA ESTOS DATOS: ${JSON.stringify(data)}` }
        ],
        temperature: 0.4,
      })
    });

    const openaiData = await response.json();
    
    return new Response(JSON.stringify(openaiData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error OpenAI:", error);
    return new Response(JSON.stringify({ 
      choices: [{ message: { content: "Estimado productor, por una intermitencia técnica momentánea no pudimos generar la recomendación automática. Un asesor humano le contactará a la brevedad." }}]
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
