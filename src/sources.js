// PDF 6ページ目の出典一覧（番号 → 出典）
const S = {
  fujiya: { t: 'SONY(ソニー) α7 IV 実写レビュー、画質、高感度、AF、動画性能をチェック！', u: 'https://www.fujiya-camera.co.jp/blog/detail/info/20220112/' },
  tsutsui: { t: '学校撮影カメラマンがSONY α7IVを1年間使ってみた(正直レビュー)｜筒井 遥', u: 'https://note.com/tsut_tsu/n/n96ad604e29bd' },
  shichi: { t: '【3年使用レビュー】ソニーα7IVを長期使用して分かったメリットデメリット | シチミカメラ', u: 'https://shichicame.xsrv.jp/a7iv-review-functioins' },
  chimo: { t: 'WD80EAZZ（WD Blue 8TB）レビュー：安いのにHGST製でCMR方式のHDD | ちもろぐ', u: 'https://chimolog.co/bto-hdd-wd80eazz/' },
  pcm: { t: 'WD Blue 8TB HDDが安くなっている。｜パソコンマスター', u: 'https://note.com/pcmaster/n/ne319e540aae0' },
  ascii2: { t: '大容量HDDはWD Blueの8TBモデルがオススメ！ 理由はCMR記録方式による信頼性 - 週刊アスキー', u: 'https://weekly.ascii.jp/elem/000/004/077/4077757/2/' },
  backup: { t: '学生のためのバックアップガイド2025：データ保護の基礎 | おちゃめなエンジニア日記', u: 'https://www.tech-life-ramen.com/tech/student-backup-guide' },
  ascii1: { t: '大容量HDDはWD Blueの8TBモデルがオススメ！ 理由はCMR記録方式による信頼性 - 週刊アスキー', u: 'https://weekly.ascii.jp/elem/000/004/077/4077757/' },
  chie1: { t: '高校生でsonya7iiを使うには十分すぎますか？部活の写真を撮ったり', u: 'https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q13208141098' },
  kira: { t: '【中高写真部向け】新入部員必見！メーカー別おすすめの初心者向けカメラ | きらめきフォトサービス', u: 'https://kirameki-ps.com/blog/archives/335' },
  kakaku: { t: 'α7 IV ILCE-7M4 ボディ - デジタル一眼カメラ - クチコミ掲示板', u: 'https://bbs.kakaku.com/bbs/K0001403297/SortID=24551339/' },
  chie2: { t: 'SONYα7IVのいい所と悪いところ教えてください - Yahoo!知恵袋', u: 'https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q10320289305' },
  steenz: { t: '見慣れた日常をカメラを通して特別な一瞬に。プロの写真家を目指す高校生【なつキ・18歳】｜ Steenz(スティーンズ)', u: 'https://steenz.jp/10438/' },
  fuji: { t: '鈴木啓悟｜富士山インタビュー｜富士山世界遺産国民会議', u: 'https://www.mtfuji.or.jp/thought/interview/vol105' },
  agent: { t: '中学生・高校生でもできる手軽な副業10選・始める際の注意点', u: 'https://agent-network.com/bitwork/recommend250' },
};

const map = {
  1: 'fujiya', 2: 'fujiya', 7: 'fujiya', 8: 'fujiya',
  3: 'tsutsui', 4: 'tsutsui', 6: 'tsutsui',
  5: 'shichi', 30: 'shichi', 31: 'shichi',
  9: 'chimo', 10: 'chimo', 11: 'chimo', 14: 'chimo',
  12: 'pcm', 15: 'pcm', 16: 'pcm', 17: 'pcm',
  13: 'ascii2',
  18: 'backup', 19: 'backup', 20: 'backup', 21: 'backup', 22: 'backup', 23: 'backup', 24: 'backup', 25: 'backup',
  26: 'ascii1', 27: 'chie1', 28: 'kira', 29: 'kakaku', 32: 'chie2',
  33: 'steenz', 34: 'steenz', 36: 'steenz',
  35: 'fuji', 37: 'agent',
};

export const sources = {};
for (const [n, k] of Object.entries(map)) sources[n] = S[k];

// PDF記載どおりのグループ（番号のまとまり）
export const groups = [
  [[1, 2, 7, 8], 'fujiya'], [[3, 4, 6], 'tsutsui'], [[5, 30, 31], 'shichi'],
  [[9, 10, 11, 14], 'chimo'], [[12, 15, 16, 17], 'pcm'], [[13], 'ascii2'],
  [[18, 19, 20, 21, 22, 23, 24, 25], 'backup'], [[26], 'ascii1'], [[27], 'chie1'],
  [[28], 'kira'], [[29], 'kakaku'], [[32], 'chie2'], [[33, 34, 36], 'steenz'],
  [[35], 'fuji'], [[37], 'agent'],
].map(([nums, k]) => ({ nums, ...S[k] }));
