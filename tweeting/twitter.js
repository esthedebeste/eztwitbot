import { TwitterApi } from "twitter-api-v2";
const baseConfig = {
  appKey: process.env.TWITTERAPIKEY.trim(),
  appSecret: process.env.TWITTERAPISECRET.trim(),
};
const twitter = new TwitterApi(baseConfig);
const newtwt = (accessToken, accessSecret) =>
  new TwitterApi({ ...baseConfig, accessToken, accessSecret });
const login = (accessToken, accessSecret, oauthVerifier) =>
  newtwt(accessToken, accessSecret).login(oauthVerifier);
export { twitter, login, newtwt };
