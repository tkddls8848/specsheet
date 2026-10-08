export default {
  title: "devlog archive",
  tagline: "IBM · Lenovo · HPE · Dell · NetApp · Oracle 제품 문서 갱신을 쌓아 두는 곳",
  githubUser: "tkddls8848",
  // 개발 일지와 뉴스레터는 별도 사이트다. 도메인이 바뀌면 환경 변수로 덮어쓴다.
  devlogUrl: process.env.DEVLOG_URL || "https://devlog.tkddls8848.workers.dev/devlog/",
  newsUrl: process.env.NEWS_URL || "https://specsheet.tkddls8848.workers.dev/",
};
