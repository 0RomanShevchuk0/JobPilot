/** DOU's id: sources.id and postings.source_id in the database, the name of its session file */
export const DOU_ID = "dou";
export const DOU_NAME = "DOU";
export const DOU_BASE_URL = "https://jobs.dou.ua";
/** one account for all of dou.ua: the session's cookies are the main site's, they work on jobs.dou.ua */
export const DOU_COOKIE_DOMAIN = "dou.ua";
/** the cookie DOU keeps the login in; the others are mostly analytics */
export const DOU_LOGIN_COOKIE = "sessionid";
