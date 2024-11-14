import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import fs from "fs";
import mjml2html from "mjml";
import Handlebars from "handlebars";
import { Model } from "objection";

import { splitAndFlat, IArrayString } from "dbl-utils";
import moment from "moment";

interface IEmailProcessModel extends Model, SendMailOptions {
  id: number | string;
  emailAddress: string[];
  order: number;
  status: string;
  lastAttempt: string;
  attempts: number;
  active: boolean;
}

export type IEmailConfig = {
  EmailProcessModel: typeof Model | null;
  SystemModel: typeof Model | null;
  colorPrimary: string;
  attemptsTotal: number;
  maxScheduling: number;
  maxPriorScheduling: number;
  priorOrder: number;
  runningPriorSchedule: boolean;
  runningSchedule: boolean;
  priorDelay: number;
  delay: number;
}

const config: IEmailConfig = {
  EmailProcessModel: null,
  SystemModel: null,
  colorPrimary: '#ffffff',
  attemptsTotal: 3,
  maxScheduling: 10,
  maxPriorScheduling: 20,
  priorOrder: 10,
  runningPriorSchedule: false,
  runningSchedule: false,
  priorDelay: 1000 * 60,
  delay: 1000 * 60 * 60,
};

export function setEmailProcessModel(EmailProcessModel: typeof Model) {
  config.EmailProcessModel = EmailProcessModel;
}

export function setSystemModel(SystemModel: typeof Model) {
  config.SystemModel = SystemModel;
}

export function colorPrimary(color: string) {
  config.colorPrimary = color;
}

export function setConfig(cfg: Partial<IEmailConfig>) {
  Object.assign(config, cfg);
}

const buildTemplate = (template: string, data: Record<string, any>) => {
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
        colorPrimary: config.colorPrimary
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

const sendEmail = async (to: string | string[], template: string, data: object, order = 10) => {
  if (!config.EmailProcessModel) return false;

  const emailElements = buildTemplate(template, data);
  const emailProcess = config.EmailProcessModel.fromJson({
    emailAddress: splitAndFlat([to]),
    ...emailElements,
    order,
    active: true
  });

  try {
    const response = await config.EmailProcessModel.query().insert(emailProcess);
    console.log('email scheduled:', response);
    return true;
  } catch (err) {
    console.error('error scheduling email:');
    console.error(err);
    return false;
  }
}

export const processEmailList = async (transporter: Transporter, emailList: IEmailProcessModel[]) => {
  if (!config.EmailProcessModel) return false;
  for (const emailDoc of emailList) {
    if (['archived', 'completed'].includes(emailDoc.status)) continue;
    try {
      await transporter.sendMail({
        from: emailDoc.from,
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
      emailDoc.lastAttempt = moment().format('YYYY-mm-dd HH:mm:ss');
      emailDoc.active = false;
    } catch (error) {
      console.error('Failed to send email:', error);
      emailDoc.attempts += 1;
      emailDoc.lastAttempt = moment().format('YYYY-mm-dd HH:mm:ss');
      emailDoc.status = emailDoc.attempts > config.attemptsTotal ? 'archived' : 'failed';
    }
    await config.EmailProcessModel.query().update(emailDoc).catch(e => console.error(e));
  }
};

export const enqueueEmailList = async (transportConf: Partial<Transporter>) => {
  if (!config.SystemModel) return false;
  if (!config.EmailProcessModel) return false;
  let t9r: Transporter;
  try {
    //configuration of oauth2.0
    /* const sysTokens: ISystemConfigModel | null =
      await config.SystemModel.query().findOne({ name: 'emailTokens' }) as ISystemConfigModel | null;
    if (!sysTokens || !sysTokens.value) throw new Error('Email OAuth2 not configured');
    const refreshToken = sysTokens.value;
    {
      service: process.env.EMAIL_SERVICE,
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken
      }
    } */
    t9r = await new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport(transportConf);
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
    config.runningPriorSchedule = true;
    const emailList = await config.EmailProcessModel!.query()
      .where('order', '<=', config.priorOrder)
      .whereNotIn('status', ['completed', 'expired', 'archived'])
      .where('attempts', '<=', config.attemptsTotal)
      .orderBy('order', "ASC")
      .limit(config.maxPriorScheduling);
    console.log('emailList prior:', emailList.length);
    await processEmailList(t9r, emailList as IEmailProcessModel[]);
    config.runningPriorSchedule = false;
  }, config.priorDelay);

  setInterval(async () => {
    if (config.runningPriorSchedule) return;
    config.runningSchedule = true;
    const emailList = await config.EmailProcessModel!.query()
      .where('order', '>', config.priorOrder)
      .whereNotIn('status', ['completed', 'expired', 'archived'])
      .where('attempts', '<=', config.attemptsTotal)
      .orderBy('order', "ASC")
      .limit(config.maxScheduling);
    console.log('emailList standard:', emailList.length);
    await processEmailList(t9r, emailList as IEmailProcessModel[]);
    config.runningSchedule = false;
  }, config.delay);

  return true;
}

export default sendEmail;

