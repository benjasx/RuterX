const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

// 1. Cargamos el archivo JSON de credenciales que descargaste
const serviceAccount = require("./credenciales.json");

// 2. Inicializamos la conexión oficial de Firebase con la nueva sintaxis modular
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function respaldarTodo() {
  const baseDeDatos = {};
  console.log("⏳ Conectando a la base de datos...");

  try {
    // 3. Obtenemos todas tus colecciones (clientes, rutas, etc.)
    const colecciones = await db.listCollections();

    for (let coleccion of colecciones) {
      console.log(`📥 Descargando colección: ${coleccion.id}...`);
      const snapshot = await coleccion.get();
      baseDeDatos[coleccion.id] = {};

      snapshot.forEach(doc => {
        baseDeDatos[coleccion.id][doc.id] = doc.data();
      });
    }

    // 4. Guardamos la información en el archivo final
    fs.writeFileSync(
      "mi_respaldo_firestore.json", 
      JSON.stringify(baseDeDatos, null, 2)
    );
    
    console.log("✅ ¡Respaldo completado con éxito! Archivo: mi_respaldo_firestore.json");
  } catch (error) {
    console.error("❌ Error al realizar el respaldo:", error);
  }
}

respaldarTodo();