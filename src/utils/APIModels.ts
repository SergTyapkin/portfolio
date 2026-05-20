import { validateModel } from '@sergtyapkin/models-validator';

export const UserModel = {
  id: String,
  username: String,
  email: String,
  role: new Set(['admin', 'user']),
};

export const UserModelMockData = validateModel(UserModel, {
  id: 'USER_ID',
  username: 'SergTyapkin',
  email: 'Tyapkin2002@mail.ru',
  role: 'user',
});
