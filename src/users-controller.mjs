
import UserModel from '../models/user-model.mjs';
import ProfileUserModel from '../models/profile-user-model.mjs';
import ProfileGroupModel from '../models/profile-group-model.mjs';
import MongooseController from '../utils/mongoose-controller.mjs';
import { decrypt } from '../utils/crypt.mjs';

class UsersController extends MongooseController {
  static jsClass = 'UsersController';
  constructor(Model, session, path, requestId) {
    super(UserModel, session, path, requestId);
  }

  async getTheSession() {
    const profile = await ProfileUserModel.findById(this.session.user.profile);
    const profileGroup = await ProfileGroupModel.findById(this.session.user.groupedBy.profile).populate('subscription');
    const tokens = decrypt(profileGroup.tokens, process.env.SECRET_TOKENS, this.session.group.iv);
    return this.r(200, {
      data: {
        user: {
          id: this.session.user.id,
          email: this.session.user.email,
          image: profile.image,
          username: this.session.user.label,
          phone: this.session.user.phone
        },
        role: this.session.role.toJSON(),
        company: {
          companyName: this.session.group.label,
          taxName: profileGroup.taxName,
          taxId: profileGroup.taxId
        },
        tokens: Number(tokens) || 0,
        subscription: profileGroup.subscription?.name
      }
    });
  }
}
export default UsersController;