import nodemailer from "nodemailer";
import fs from "fs";
import mjml2html from "mjml";
import Handlebars from "handlebars";

import EmailProcessModel from "../models/_email-process-model.mjs";
import SystemModel from "../models/_system-model.mjs";

const buildTemplate = (template, data) => {
  let text;
  let html;
  let subject;
  //encriptar correo para almacenarlo, desencriptar para enviarlo
  switch (template) {
    case 'otp':
      const mjmlOtp = fs.readFileSync('./templates/otp.mjml', 'utf8');
      const { html, errors } = mjml2html(mjmlOtp, { filePath: './templates' });
      if (errors.length) {
        console.error(
          errors.filter(e => !e.message.includes('has invalid value: {'))
        );
      }
      const template = Handlebars.compile(html);
      const htmlBuilded = template({
        ...data,
        frontend: process.env.FRONTEND,
        colorPrimary: '#4B86B4' //TODO: crear una función para pasar las variables de colores del frontend
      });
      return {
        subject: '[Kreditor] Código de validación',
        html: htmlBuilded,
        text: [
          data.userName,
          ' este es tu código de validación: ',
          data.otp,
          '\n',
          'Este dato es personal e intrasferible. Por favor, no compartas este código con nadie.'
        ].join(' '),
        cc: [],
        bcc: [],
        attachments: []
      }

    default:
      break;
  }
  return {
    subject,
    html,
    text
  };
}

const sendEmail = async (to, template, data, order = 10) => {
  const emailElements = buildTemplate(template, data);
  const email = new EmailProcessModel({
    emailAddress: [to].flat(),
    ...emailElements,
    order,
    active: true
  });
  await email.save();
}

export const processEmailList = async (transporter, emailList) => {
  for (const emailDoc of emailList) {
    try {
      await transporter.sendMail({
        from: 'Kreditor <no-reply@kreditor.com.mx>',
        to: emailDoc.emailAddress,
        html: emailDoc.html,
        text: emailDoc.text,
        attachments: emailDoc.attachments,
        cc: emailDoc.cc,
        bcc: emailDoc.bcc,
        subject: emailDoc.subject,
      });
      console.log(`Email sent to ${emailDoc.emailAddress}`);
      emailDoc.status = 'completed';
      emailDoc.lastAttempt = new Date();
      emailDoc.active = false;
    } catch (error) {
      console.error('Failed to send email:', error);
      emailDoc.attempts += 1;
      emailDoc.lastAttempt = new Date();
      emailDoc.status = emailDoc.attempts > 3 ? 'archived' : 'failed';
    }
    await emailDoc.save();
  }
};

export const enqueueEmailList = async () => {
  let t9r;
  try {
    const sysTokens = await SystemModel.findOne({ name: 'emailTokens' });
    if (!sysTokens || !sysTokens.value) throw new Error('Email OAuth2 not configured');
    const refreshToken = sysTokens.value.refresh_token;
    t9r = await new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER,
          clientId: process.env.EMAIL_CLIENT_ID,
          clientSecret: process.env.EMAIL_CLIENT_SECRET,
          refreshToken
        }
      });
      transporter.verify((error, success) => {
        if (error) {
          console.error('Error al conectar con el servidor SMTP:', error);
          reject(error);
        } else {
          console.log('Servidor está listo para enviar correos:', success);
          resolve(transporter);
        }
      });
    });
  } catch (error) {
    console.error('[ERROR]', error);
    return false;
  }
  console.log('enqueue emails');

  setInterval(async () => {
    const emailList = await EmailProcessModel
      .find({
        order: { $lt: 10 },
        status: { $nin: ['completed', 'expired', 'archived'] },
        attempts: { $lt: 3 }
      })
      .sort({ order: 1 }).limit(process.env.EMAIL_MAX_PRIOR || 10);
    console.log('emailList prior:', emailList.length);
    processEmailList(t9r, emailList);
  }, 60000);

  setInterval(async () => {
    const emailList = await EmailProcessModel
      .find({
        order: { $gte: 10 },
        status: { $nin: ['completed', 'expired', 'archived'] },
        attempts: { $lt: 3 }
      })
      .sort({ order: 1 }).limit(process.env.EMAIL_MAX_STD || 100);
    console.log('emailList standard:', emailList.length);
    processEmailList(t9r, emailList);
  }, 1800000);

  return true;
}

export default sendEmail;

