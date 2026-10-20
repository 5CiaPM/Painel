// Cole aqui a configuração do seu app web do Firebase
// (Console Firebase → Configurações do projeto → Seus apps → Config).
// Enquanto estiver com "COLE_AQUI", o painel funciona em modo LOCAL (salva só neste navegador).
export const firebaseConfig = {
  apiKey: "AIzaSyBEHA2j8BoVqLLY9Toxr9w54nGDgrGayXI",
  authDomain: "painel-adm-8aeb2.firebaseapp.com",
  projectId: "painel-adm-8aeb2",
  storageBucket: "painel-adm-8aeb2.firebasestorage.app",
  messagingSenderId: "916126555168",
  appId: "1:916126555168:web:ce7a7fad7e32aeef7a7045",
  measurementId: "G-HHR1THL9HJ"
};

export const usarFirebase = !String(firebaseConfig.apiKey).startsWith("COLE");
