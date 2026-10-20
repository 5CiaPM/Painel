# Painel de Serviço — 5ª Cia PM

Site estático (HTML + JS puro, sem build) com Firebase (Auth + Firestore), hospedado na Vercel.

## Recursos
- **Acesso rápido**: botões da planilha (editáveis em `links.js`). Pastas de rede copiam o caminho; links web abrem em nova aba.
- **Agenda mensal**: calendário + lembretes com data/hora. Ao chegar a hora, o compromisso **pisca** (e o título da aba) até clicar **OK**.
- **Aniversariantes**: no dia do aniversário (e até 3 dias depois, se o painel não foi aberto) a data e o nome **piscam** até clicar **OK**. Volta a piscar no ano seguinte.
- **Lembretes fixos**: lista editável (Planilha TDS dia 09, Disk denúncia etc.).

## Testar local
```
python3 -m http.server 8000   # abra http://localhost:8000
```
Sem configurar o Firebase, funciona em **modo local** (salva só no navegador).

## Firebase
1. console.firebase.google.com → criar projeto → **Authentication** → ativar *E-mail/senha* → criar seu usuário.
2. **Firestore Database** → criar (modo produção) → aba *Regras* → colar o conteúdo de `firestore.rules` → Publicar.
3. Configurações do projeto → *Seus apps* → app Web → copiar a config para `firebase-config.js`.
4. Authentication → Configurações → *Domínios autorizados* → adicionar o domínio da Vercel.

## GitHub + Vercel
```
git init && git add . && git commit -m "Painel de Serviço"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/painel-servico.git
git push -u origin main
```
Vercel → *Add New Project* → importar o repositório → Framework: **Other** → Deploy.

## Observação sobre os links de pasta
Navegadores bloqueiam `file://` e `\\servidor` a partir de sites https. Por isso o botão copia o caminho; cole no Explorador (Ctrl+L). O botão do ícone da sirene aponta para `BO/Detect_Master.html` (caminho relativo da planilha): ajuste em `links.js` para a URL real.
