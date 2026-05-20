import REST_API from '@sergtyapkin/rest-api';
import { validateModel, type Model } from '@sergtyapkin/models-validator';
import {UserModel, UserModelMockData} from '~/utils/APIModels';
import { User } from '~/utils/models';

type RequestFunc = (url: string, data?: object) => Promise<{ data: object; status: number; ok: boolean }>;
type MyResponse<T> = Promise<{ data: T; status: number; ok: boolean }> | { data: T; status: number; ok: boolean };

const Response200 = (data: any) => ({
  status: 200,
  ok: true,
  data: data,
});

export default class API extends REST_API {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  async modelParsedRequest(
    requestFunc: RequestFunc,
    path: string,
    data = {},
    model?: Model,
    mockData?: MyResponse<object>,
  ): Promise<{ ok: boolean; data: object; status: number }> {
    if (mockData && import.meta.env.MODE !== 'production') {
      console.info(`Request mocked: ${requestFunc.name}, ${path},`, mockData);
      return mockData;
    }

    data = Object.assign({}, data);
    const { ok, data: dataRes, status } = await requestFunc.bind(this)(path, data);
    if (!ok) {
      return { ok, data: dataRes as object, status };
    }

    if (!model) {
      return { ok, data: dataRes, status };
    }
    return { ok, data: validateModel(model, dataRes), status };
  }
  #POST(path: string, data = {}, model?: Model, mockData?: MyResponse<object>) {
    return this.modelParsedRequest(super.post, path, data, model, mockData);
  }
  #GET(path: string, data = {}, model?: Model, mockData?: MyResponse<object>) {
    return this.modelParsedRequest(super.get, path, data, model, mockData);
  }
  #PUT(path: string, data = {}, model?: Model, mockData?: MyResponse<object>) {
    return this.modelParsedRequest(super.put, path, data, model, mockData);
  }
  #DELETE(path: string, data = {}, model?: Model, mockData?: MyResponse<object>) {
    return this.modelParsedRequest(super.delete, path, data, model, mockData);
  }

  // Api configuration
  // User
  getUser = () =>
    this.#GET(`/user`, {}, UserModel, Response200(UserModelMockData)) as MyResponse<User>;
  updateProfile = (id: string, profileData: { username?: string; email?: string; password?: string }) =>
    this.#PUT(`/user/${id}`, profileData, UserModel) as MyResponse<User>;
  register = (username: string, email: string, password: string) =>
    this.#POST(`/user`, { username, email, password }, UserModel) as MyResponse<User>;
  deleteProfile = () =>
    this.#DELETE(`/user`) as MyResponse<unknown>;
  login = (usernameOrEmail: string, password: string) =>
    this.#POST(`/auth`, { username_or_email: usernameOrEmail, password }, UserModel) as MyResponse<User>;
  logout = () =>
    this.#DELETE(`/auth`) as MyResponse<unknown>;
  sendPasswordRestorationLetter = () =>
    this.#POST(`/auth/password/restore`) as MyResponse<unknown>;
  restorePasswordByCode = (code: string, newPassword: string): MyResponse<unknown> =>
    this.#PUT(`/auth/password/restore`, { code, new_password: newPassword }) as MyResponse<unknown>;
}
