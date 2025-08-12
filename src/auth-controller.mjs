import moment from "moment/moment.js";
import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';
import useragent from 'useragent';
import geoip from "geoip-lite";
import { v4 as uuidv4 } from "uuid";


import { slugify } from "dbl-components/lib/js/functions/index.js";

import MongooseController from '../utils/mongoose-controller.mjs';
import {
  buildToken, encrypt, generateCode,
  readToken, generatePasswordHash,
  verifyPasswordHash,
  getClientType
} from "../utils/crypt.mjs";
import sendEmail, { enqueueEmailList } from "../utils/email.mjs";
import { addStatusCodes } from "../utils/backend-controller.mjs";

import UserModel from '../models/user-model.mjs';
import GroupModel from '../models/group-model.mjs';
import ProfileUserModel from '../models/profile-user-model.mjs';
import ProfileSuperAdminModel from '../models/profile-super-admin-model.mjs';
import ProfileGroupModel from '../models/profile-group-model.mjs';
import SubscriptionModel from "../models/subscription-model.mjs";
import SystemModel from "../models/_system-model.mjs";
import SessionModel from "../models/session-model.mjs";
import RoleModel from "../models/role-model.mjs";

addStatusCodes({
  register: {
    '403': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 0,
      description: "The server understood the request but refuses to authorize it."
    },
    '403.1': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 1,
      description: "Key code incorrect."
    },
    '403.2': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 2,
      description: "Key code expired."
    },
    '403.2b': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 2,
      description: "Token expired."
    },
    '403.3': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 3,
      description: "Invalid platform."
    },
    '403.4': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 4,
      description: "Invalid user."
    },
    '403.5': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 5,
      description: "There is not any OTP process."
    },
    '403.6': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 6,
      description: "Session not found."
    },
    '400.1': {
      error: true,
      success: false,
      message: "Bad Request",
      status: 400,
      code: 1,
      description: "Missing password."
    }
  },
  login: {
    //wrong user
    '403.1': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 1,
      description: "User not found."
    },
    //wrong password
    '403.2': {
      error: true,
      success: false,
      message: "Forbidden",
      status: 403,
      code: 1,
      description: "User not found."
    }
  }
});

class AuthController extends MongooseController {
  static jsClass = 'AuthController';
  constructor(Model, session, path, requestId) {
    super(Model, session, path, requestId);
  }

  async createSession(user, {
    req,
    expireSecs = 3600,
    times = -1,
    labelSufix = 'SESSION',
    iv
  } = {}) {
    //create new session
    const ipReal = req.get('x-forwarded-for') ? req.get('x-forwarded-for').split(',')[0].trim() : req.socket.remoteAddress;
    const ip = ipReal === '::1' ? process.env.HARDCODED_IP : ipReal;
    const sessionName = uuidv4();
    const location = geoip.lookup(ip);
    const userAgent = req.get('User-Agent');
    const clientType = getClientType(userAgent, req.get('Device'));

    const description = [`SESSION UUID: ${sessionName}`];
    description.push(`IP: ${ip}`);
    if (clientType) description.push(`Client: ${clientType}`);
    if (userAgent.trim()) description.push(`User-Agent:  ${userAgent.trim()}`);
    let locationStr = [];
    if (location) {
      locationStr.push(
        location.city, location.region,
        location.country
      );
      description.push(`Location: ${locationStr.join(', ')}`, `Time-Zone: ${location.timezone}`);
    }

    const session = new SessionModel({
      name: sessionName,
      label: `[${labelSufix}] ${clientType} - ${ip} from ${locationStr.join(', ')}`,
      description: description.join('\n'),
      token: buildToken({ session: sessionName }, process.env.MASTER_KEY, iv, expireSecs),
      expiresAt: moment().add(expireSecs, 'seconds').toDate(),
      ip,
      timesTotal: times,
      timesUsed: 0,
      userAgent,
      location,
      deviceId: req.get('Device-Id'),
      clientType,
      createdBy: user._id,
      groupedBy: user.groupedBy,
      active: true
    });
    await session.save();
    return session;
  }

  async register(data) {
    try {
      const otp = generateCode();
      const opts = {};
      const { encryptedData: tokens, iv } = encrypt('0', process.env.SECRET_TOKENS);
      const profileUsr = new ProfileUserModel({
        tokens,
        image: '/images/user-default.webp',
        position: data.work
      });
      await profileUsr.save(opts);
      const nuser = new UserModel({
        name: data.email,
        email: data.email,
        label: data.name,
        phone: data.phone,
        profileType: 'ProfileUsers',
        profile: profileUsr._id,
        otp: jwt.sign({ otp, task: 'register' }, this.requestId.toString(), { expiresIn: '1h' })
      });
      await nuser.save(opts);
      const gLabel = data.company || data.name;
      const gName = slugify(data.email);
      const subscription = !!data.subscription ? await SubscriptionModel.findOne({ name: data.subscription }) : null;
      const profileGr = new ProfileGroupModel({
        tokens,//tokens value
        subscription: subscription?._id,
        creditCards: [],
        clients: [],
        reports: [],
        renewDay: moment().day()
      })
      await profileGr.save(opts);
      const roleAdmin = await RoleModel.findOne({ name: 'principal' });
      const ngroup = new GroupModel({
        label: gLabel,
        name: gName,
        users: [{ role: roleAdmin._id, user: nuser._id }],
        iv,
        profile: profileGr._id,
        createdBy: nuser._id
      });
      await ngroup.save(opts);
      nuser.groupedBy = ngroup._id;
      await nuser.save(opts);
      await sendEmail(nuser.name, 'otp', {
        otp, userName: data.name
      }, 1);

      return this.r(202);
    } catch (error) {
      let status = 500;
      if (error instanceof MongoServerError && error.code === 11000) status = 409;
      return this.r(status, error);
    }
  }

  async validate(data, req) {
    const user = await UserModel.findOne({ email: data.email });
    const toReturn = {};
    try {
      if (!user) throw new Error('user');
      if (!user.otp) throw new Error('not-code');
      const { otp: code, task } = jwt.decode(user.otp, data.otpRequest);
      if (task !== 'register') throw new Error('diff');
      if (code.trim() !== data.code.trim()) throw new Error('diff');
      toReturn.success = true;
    } catch (error) {
      let status = 500;
      let code = 0;
      toReturn.success = false;
      if (error.message === 'not-code') {
        status = 403;
        code = 5;
      } else if (error.message === 'user') {
        status = 403;
        code = 4;
      } else if (error.message === 'diff') {
        status = 403;
        code = 1;
      } else if (error instanceof jwt.TokenExpiredError) {
        status = 403;
        code = 2;
      } else if (error instanceof jwt.JsonWebTokenError) {
        status = 403;
        code = 3;
      } else {
        console.error(error);
      }
      return this.r(status, code, 'register', toReturn);
    }
    user.otp = null;
    //create a token for signUp setting their password by the very first time
    const group = await GroupModel.findOne({ users: { $elemMatch: { user: user._id } } });
    const session = await this.createSession(user, { req, expireSecs: 3600, times: 1, labelSufix: 'SET_PASSWORD', iv: group.iv });
    user.sessions.push(session._id);
    user.status = 'pending';
    await user.save();
    toReturn.data = { token: session.token };
    return this.r(200, toReturn);
  }

  async emailOauth(data, req, res) {
    const { EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET } = process.env;
    const SCOPES = ['https://mail.google.com/'];

    const protocol = req.protocol;
    const REDIRECT_URI = `${protocol}://${req.get('host')}/system/email-callback`;

    const oAuth2Client = new OAuth2Client(EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, REDIRECT_URI);

    const confOAuth = {
      access_type: 'offline',
      scope: SCOPES
    }
    if (data.force) confOAuth.prompt = 'consent';
    else {
      const emailRefreshToken = await SystemModel.findOne({ name: 'emailRefreshToken' });
      if (emailRefreshToken) return this.r(200);
    }
    const authUrl = oAuth2Client.generateAuthUrl(confOAuth);
    console.info('email authUrl', authUrl);
    res.redirect(authUrl);
    return [...this.r(202, { authUrl }), true];
  }

  async emailCallback({ code }, req) {
    const { EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET } = process.env;
    const protocol = req.protocol;
    const REDIRECT_URI = `${protocol}://${req.get('host')}/system/email-callback`;

    const oAuth2Client = new OAuth2Client(EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, REDIRECT_URI);

    try {
      var { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
    } catch (error) {
      console.error('[ERROR] Email Tokens:', error);
      return this.r(502, error);
    }

    let emailTokens = await SystemModel.findOne({ name: 'emailTokens' });
    if (!emailTokens) {
      emailTokens = new SystemModel({
        label: "Email Tokens",
        name: 'emailTokens',
        description: 'Tokens to allow send email by OAuth2.0',
        value: tokens
      });
    } else if (tokens.refresh_token) {
      emailTokens.value = tokens;
    } else {
      console.info('Is not update on system.emailTokens');
    }
    await emailTokens.save();
    enqueueEmailList();
    return this.r(200, { tokens });
  }

  async setPass({ token, newPass, email }) {
    let status = 500;
    let code = 0;
    const toReturn = {};
    try {
      if (!newPass) throw new Error('notPass');

      const user = await UserModel.findOne({ email }).populate(['groupedBy']);
      if (!user) throw new Error('notUser');

      const group = user.groupedBy;
      const resp = readToken(token, process.env.MASTER_KEY, group.iv);
      if (resp instanceof Error) throw resp;

      const { session: sessionName } = resp;
      const session = await SessionModel.findOne({ name: sessionName, active: true });
      if (!(session && user.sessions.some(s => s._id.equals(session._id)))) throw new Error('notSession');

      if (!user.password) {
        user.active = true;
        user.status = 'active';
        group.active = true;
        group.status = 'active';
      }
      user.password = await generatePasswordHash(newPass);

      session.active = false;
      session.timesUsed++;
      session.status = 'completed';

      await Promise.all([user.save(), session.save(), group.save()]);
      status = 200;
      code = 0;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        status = 403;
        code = '2b';
      } else if (error instanceof jwt.JsonWebTokenError) {
        status = 403;
        code = 3;
      } else if (error.message.toLowerCase().includes('salt')) {
        console.log(error, error.code);
        status = 403;
        code = 3;
      } else if (error.message === 'notSession') {
        status = 403;
        code = 6;
      } else if (error.message === 'notUser') {
        status = 403;
        code = 4;
      } else if (error.message === 'notPass') {
        status = 400;
        code = 1;
      } else {
        toReturn.message = error.message;
        code = error.code || 0;
        console.error(error, '     =================>', error.code);
      }
    }

    return this.r(status, code, 'register', toReturn);
  }

  async resendOtpRegister({ email }) {
    const user = await UserModel.findOne({ email, active: false, status: { $in: ['created', 'pending'] } });
    if (!user) return this.r(403, 4, 'register');
    const otp = generateCode();
    user.otp = jwt.sign({ otp, task: 'register' }, this.requestId.toString(), { expiresIn: '1h' });
    await sendEmail(user.email, 'otp', { otp }, 1);
    return this.r(202);
  }

  async login({ email, pass: password, rememberme }, req) {
    let status = 500;
    let code = 0;
    const toReturn = {};
    try {
      const user = await UserModel.findOne({ email, active: true }).populate({
        path: 'groupedBy',
        match: { active: true }
      });
      if (!user) throw new Error('UserNotFound');
      const group = user.groupedBy;
      const verifyPass = await verifyPasswordHash(password, user.password);
      if (verifyPass instanceof Error) throw verifyPass;
      if (!verifyPass) throw new Error('PassError');
      status = 200;
      //three months or four hours
      const expireSecs = rememberme ? 7776000 : 43200;
      const session = await this.createSession(user, { req, expireSecs, times: -1, labelSufix: 'SESSION', iv: group.iv });
      user.sessions.push(session._id);
      await user.save();
      const tmp = session.token.split('');
      console.log(tmp.length, tmp[tmp.length - 64]);
      tmp.splice(-64, 0, ...group.iv);
      console.log(group.iv);
      console.log(tmp.length, tmp[tmp.length - 96]);
      const token = tmp.join('');
      toReturn.data = { token };
    } catch (error) {
      if (error.message === 'UserNotFound') {
        status = 403;
        code = 1;
      } else if (error.message === 'PassError') {
        status = 403;
        code = 2;
      } else {
        console.log(error);
        toReturn.message = error.message;
      }
    }
    //TODO: create session and respect rememberme
    return this.r(status, code, 'login', toReturn);
  }

  async logout() {
    const session = await SessionModel.findById(this.session._id);
    session.status = 'deleted';
    session.active = false;
    await session.save();
    return this.r(200);
  }

}
export default AuthController;