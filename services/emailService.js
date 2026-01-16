const nodemailer = require('nodemailer');

/**
 * Serviço de Envio de E-mails
 * Centraliza o envio de e-mails do sistema
 */
class EmailService {
    constructor() {
        // Configuração do transporter
        // Para produção, use as credenciais do seu provedor de e-mail (Gmail, SendGrid, etc)
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false, // true para 465, false para outras portas
            auth: {
                user: process.env.EMAIL_USER, // seu e-mail
                pass: process.env.EMAIL_PASS  // sua senha ou app password
            }
        });

        // E-mail padrão do remetente
        this.defaultFrom = process.env.EMAIL_FROM || '"Meu Barbeiro" <noreply@meubarbeiro.com>';
    }

    /**
     * Envia e-mail de confirmação de cadastro da barbearia
     * @param {Object} data - Dados para o e-mail
     * @param {string} data.ownerEmail - E-mail do proprietário
     * @param {string} data.ownerName - Nome do proprietário
     * @param {string} data.companyName - Nome da barbearia
     * @param {string} data.slug - Slug da barbearia
     * @param {string} data.loginUrl - URL de acesso ao painel
     */
    async sendWelcomeEmail(data) {
        const { ownerEmail, ownerName, companyName, slug, loginUrl } = data;

        const mailOptions = {
            from: this.defaultFrom,
            to: ownerEmail,
            subject: `Bem-vindo ao Meu Barbeiro - ${companyName}`,
            html: this.getWelcomeEmailTemplate(data)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('E-mail enviado:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erro ao enviar e-mail:', error);
            // Não bloqueia o cadastro se o e-mail falhar
            return { success: false, error: error.message };
        }
    }

    /**
     * Template HTML do e-mail de boas-vindas
     */
    getWelcomeEmailTemplate(data) {
        const { ownerName, companyName, slug, loginUrl } = data;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #f10404 0%, #c40202 100%);
            color: #fff;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #f10404;
            margin-top: 0;
        }
        .info-box {
            background: #f9f9f9;
            border-left: 4px solid #f10404;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 5px 0;
        }
        .info-box strong {
            color: #f10404;
        }
        .button {
            display: inline-block;
            padding: 15px 40px;
            background: #f10404;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
            transition: background 0.3s;
        }
        .button:hover {
            background: #c40202;
        }
        .footer {
            background: #28282c;
            color: #ccc;
            text-align: center;
            padding: 20px;
            font-size: 12px;
        }
        .footer a {
            color: #f10404;
            text-decoration: none;
        }
        .features {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }
        .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #f10404;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao Meu Barbeiro!</h1>
        </div>
        
        <div class="content">
            <h2>Olá, ${ownerName}!</h2>
            
            <p>Parabéns! O cadastro da barbearia <strong>${companyName}</strong> foi concluído com sucesso!</p>
            
            <p>Seu sistema de gestão já está pronto para uso. Agora você pode:</p>
            
            <ul class="features">
                <li>Gerenciar agendamentos de forma profissional</li>
                <li>Cadastrar serviços e profissionais</li>
                <li>Controlar clientes e histórico de atendimentos</li>
                <li>Gerar relatórios detalhados</li>
                <li>Criar usuários com diferentes níveis de acesso</li>
            </ul>
            
            <div class="info-box">
                <p><strong>Dados de Acesso:</strong></p>
                <p><strong>URL do Painel:</strong> ${loginUrl}</p>
                <p><strong>Slug da Barbearia:</strong> ${slug}</p>
                <p><strong>E-mail:</strong> ${data.ownerEmail}</p>
            </div>
            
            <p><strong>Importante:</strong> Use a senha que você cadastrou para fazer login no sistema.</p>
            
            <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Acessar Painel Administrativo</a>
            </div>
            
            <p>Se você tiver qualquer dúvida ou precisar de suporte, nossa equipe está à disposição.</p>
            
            <p>Bom trabalho e sucesso! 💈</p>
        </div>
        
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Meu Barbeiro. Todos os direitos reservados.</p>
            <p>Este é um e-mail automático, por favor não responda.</p>
            <p>Precisa de ajuda? <a href="https://wa.me/5579991071656">Entre em contato</a></p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Envia e-mail de recuperação de senha
     * @param {Object} data - Dados para o e-mail
     */
    async sendPasswordResetEmail(data) {
        const { email, name, resetToken, resetUrl } = data;

        const mailOptions = {
            from: this.defaultFrom,
            to: email,
            subject: 'Recuperação de Senha - Meu Barbeiro',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f10404; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #f10404; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Recuperação de Senha</h2>
        </div>
        <div class="content">
            <p>Olá, ${name}!</p>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
            </div>
            <p>Ou copie e cole este link no navegador: ${resetUrl}</p>
            <p><strong>Este link expira em 1 hora.</strong></p>
            <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('E-mail de recuperação enviado:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erro ao enviar e-mail de recuperação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verifica se o serviço de e-mail está configurado corretamente
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('Servidor de e-mail está pronto para enviar mensagens');
            return true;
        } catch (error) {
            console.error('Erro ao verificar conexão com servidor de e-mail:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
