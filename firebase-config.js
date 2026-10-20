// Cole aqui a configuração do seu app web do Firebase
// (Console Firebase → Configurações do projeto → Seus apps → Config).
// Enquanto estiver com "COLE_AQUI", o painel funciona em modo LOCAL (salva só neste navegador).
export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

export const usarFirebase = !String(firebaseConfig.apiKey).startsWith("COLE");
