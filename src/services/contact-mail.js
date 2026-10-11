import nodemailer from 'nodemailer';

export function createContactMailer(config, createTransport = nodemailer.createTransport) {
  const configured = config.smtpHost && config.smtpUser && config.smtpPassword;
  if (!configured) {
    return {
      async send() {
        throw new Error('Contact email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.');
      }
    };
  }

  const transport = createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPassword }
  });

  return {
    async send(lead) {
      await transport.sendMail({
        from: config.smtpFrom,
        to: config.contactEmail,
        replyTo: { name: lead.name, address: lead.email },
        subject: 'New website contact form message',
        text: [
          'New contact form submission',
          '',
          `Name: ${lead.name}`,
          `Email: ${lead.email}`,
          `Company: ${lead.company || 'Not provided'}`,
          `Language: ${lead.language}`,
          '',
          'Message:',
          lead.message
        ].join('\n')
      });
    }
  };
}
