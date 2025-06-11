import fastify from "fastify";
import Mailgun from "mailgun.js";
import formData from "form-data"; // 'from' não é usado, removido para clareza
import dotenv from "dotenv";
import cors from "@fastify/cors";
// import { textChangeRangeIsUnchanged } from "typescript"; // Não está sendo usado, removido para clareza

dotenv.config();

const app = fastify();

type NodeMail = {
    from: string,
    to: string,
    subject: string,
    text: string,
    html: string
}

app.register(cors, {
    origin: "*", // ATENÇÃO: Para produção, é altamente recomendável usar a URL específica do seu frontend (ex: 'https://seufrotend.com.br')
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ["Content-Type"]
});

// A classe Mailgun é instanciada com FormData.
// Não use 'maingun' com 'a', o correto é 'mailgun' com 'i'.
const mailgunInstance = new Mailgun(formData); // Renomeado para evitar confusão

const mg = mailgunInstance.client({
    username: 'api',
    key: process.env.MAIL_GUN_API_KEY || '',
});

app.post("/send-email", async (request, reply) => { // 'response' renomeado para 'reply' que é a convenção do Fastify
    const {from, to, subject, text, html} = request.body as NodeMail;
    const domain = process.env.MAILGUN_DOMAIN || '';

    // Adicionado log para depuração inicial, mostrando os dados que a API recebeu.
    // **Importante:** NÃO logue informações sensíveis (senhas, etc.) em produção.
    console.log('Requisição recebida para /send-email. Dados:', { to, subject, text: text.substring(0, 50) + '...' }); // Loga apenas parte do texto para não poluir

    // Verificação básica para domínios ou chaves vazias antes de tentar enviar
    if (!domain || !process.env.MAIL_GUN_API_KEY) {
        console.error('Erro de configuração: Variáveis de ambiente MAILGUN_DOMAIN ou MAIL_GUN_API_KEY estão vazias.');
        return reply.status(500).send({ message: 'Erro interno do servidor: Chave de API ou Domínio do Mailgun não configurados.' });
    }

    const mailOptions = {
        from,
        to,
        subject,
        text,
        html
    };

    try {
        const mailgunResponse = await mg.messages.create(domain, mailOptions);
        console.log('Email enviado com sucesso!', mailgunResponse);
        // **CORREÇÃO AQUI:** Envia uma resposta JSON de sucesso para o frontend
        return reply.status(200).send({ message: 'Email enviado com sucesso!', data: mailgunResponse });
    } catch(error: any){ // Usado 'any' para capturar qualquer tipo de erro para logar
        console.error('Erro ao enviar email pelo Mailgun:', error);

        // **CORREÇÃO AQUI:** Envia uma resposta JSON de erro com detalhes para o frontend
        // Tenta extrair a mensagem de erro ou usa uma genérica
        const errorMessage = error.message || 'Erro desconhecido ao comunicar com Mailgun.';
        return reply.status(500).send({ message: 'Erro ao enviar email.', details: errorMessage });
    }
});

app.listen({
    host: "0.0.0.0", // O host "0.0.0.0" é essencial para o Render
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
}).then(() => {
    console.log(`Servidor Fastify funcionando na porta ${process.env.PORT || 5000}`);
}).catch((err) => {
    console.error('Erro ao iniciar o servidor Fastify:', err);
    process.exit(1); // Sai do processo se não conseguir iniciar
});