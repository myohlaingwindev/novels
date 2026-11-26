import { getDatabase } from "@/db/client";
import { hashPassword } from "@/auth/password";
import { ensureDefaultGenres } from "@/novels/genre";

const password = "password1";

const authors = [
  { name: "Mara Ellison", email: "mara@novelle.test" },
  { name: "Tomas Reyes", email: "tomas@novelle.test" },
  { name: "Ines Okafor", email: "ines@novelle.test" },
  { name: "Clara Whitmore", email: "clara@novelle.test" },
  { name: "Noor Haddad", email: "noor@novelle.test" },
];

const novels = [
  ["Mara Ellison", "The Salt Archive", "ဆားမှတ်တမ်း", "english", "A keeper finds a ledger that remembers the tide."],
  ["Mara Ellison", "Lanterns Over Kesh", "ကက်ရှ်မီးအိမ်", "xianxia", "Lanterns along a mountain road refuse to go out."],
  ["Mara Ellison", "Harbour Ledger", "ဆိပ်ကမ်းစာရင်း", "wuxia", "A swordsman audits a harbour that hides its dead."],
  ["Mara Ellison", "Glass Orchard", "ဖန်သစ်ခက်", "english", "An orchard grows fruit that shows other people's memories."],
  ["Tomas Reyes", "A Quiet Orbit", "တိတ်ဆိတ်ပတ်လမ်း", "english", "A pilot circles a silent station and waits for a reply."],
  ["Tomas Reyes", "Iron Mountain", "သံတောင်", "xianxia", "Disciples mine a mountain that answers when struck."],
  ["Tomas Reyes", "Red Blade Rain", "ဓားနီမိုး", "wuxia", "Rain follows a blade that was never sheathed."],
  ["Tomas Reyes", "Paper Saints", "စက္ကူသူတော်စင်", "english", "Paper figures in a chapel begin to keep their own vows."],
  ["Ines Okafor", "Thistle and Ash", "ဆူးပန်းနှင့်ပြာ", "wuxia", "Two rivals share one road through a burned valley."],
  ["Ines Okafor", "The Last Cartographer", "နောက်ဆုံးမြေပုံဆရာ", "english", "The final map of a city starts to redraw itself."],
  ["Ines Okafor", "Moon Well Sect", "လမိုးရေတွင်းဂိုဏ်း", "xianxia", "A sect draws power from a well that only fills at night."],
  ["Ines Okafor", "Night Market Oath", "ညဈေးကျိန်စာ", "wuxia", "A promise made in a night market cannot be returned."],
  ["Clara Whitmore", "Letters from Marlowe Street", "မာလိုလမ်းစာ", "english", "Unsent letters rearrange the lives on one street."],
  ["Clara Whitmore", "Cedar Gate", "အာရဇ်တံခါး", "xianxia", "The gate of a cedar sect opens for the wrong disciple."],
  ["Clara Whitmore", "The Winter Pact", "ဆောင်းရာသီပဋိညာဉ်", "wuxia", "A winter oath binds two clans until the thaw."],
  ["Clara Whitmore", "Blue Kiln", "အပြာရောင်မီးဖို", "english", "A potter's kiln fires glaze the colour of a warning."],
  ["Noor Haddad", "Silk and Cinder", "ပိုးနှင့်ပြာမီး", "xianxia", "Silk cultivators tend a flame that eats names."],
  ["Noor Haddad", "The Ninth Bell", "နဝမခေါင်းလောင်း", "wuxia", "The ninth bell of a temple calls the wrong fighter."],
  ["Noor Haddad", "Salt Road Diary", "ဆားလမ်းမှတ်စု", "english", "A diary found on the salt road is still being written."],
  ["Noor Haddad", "Crane Pavilion", "ကြိုးကြာခန်းမ", "xianxia", "Cranes refuse to leave a pavilion that has lost its master."],
] as const;

const chapterTitles = ["အစ", "လမ်းခွဲ", "ညစာ", "ကတိ", "မုန်တိုင်း", "တံခါး", "အမည်", "မီးအိမ်", "ပြန်လမ်း", "အဆုံး"];

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function burmeseBody(titleMy: string, chapterTitle: string, number: number) {
  return [
    `${titleMy} ၏ ${chapterTitle} အခန်းတွင် ဇာတ်လမ်း ဆက်လက်ဖြစ်ပေါ်သည်။`,
    `ဇာတ်ကောင်များသည် အခန်း ${number} တွင် ရွေးချယ်မှုအသစ်နှင့် ရင်ဆိုင်ရသည်။`,
    "ဤအပိုင်း၏အဆုံးတွင် နောက်ထပ်မေးခွန်းတစ်ခု ကျန်ရှိနေသေးသည်။",
  ].join("\n\n");
}

async function main() {
  const db = getDatabase();
  await ensureDefaultGenres(db);
  const passwordHash = hashPassword(password);
  const now = Date.now();
  const users = new Map<string, { id: bigint }>();
  for (const author of authors) {
    const existing = await db.user.findUnique({ where: { email: author.email } });
    const saved = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: { name: author.name, role: "author", passwordHash },
        })
      : await db.user.create({
          data: { email: author.email, name: author.name, role: "author", passwordHash, createdAt: now },
        });
    users.set(author.name, saved);
  }
  const readerEmail = "reader@novelle.test";
  const reader = await db.user.findUnique({ where: { email: readerEmail } });
  if (reader) {
    await db.user.update({ where: { id: reader.id }, data: { name: "Demo Reader", role: "user", passwordHash } });
  } else {
    await db.user.create({
      data: { email: readerEmail, name: "Demo Reader", role: "user", passwordHash, createdAt: now },
    });
  }

  const slugs = novels.map((novel) => slugify(novel[1]));
  await db.novel.deleteMany({ where: { slug: { in: slugs } } });
  for (const [authorName, title, titleMy, genre, description] of novels) {
    const owner = users.get(authorName);
    if (!owner) throw new Error(authorName);
    const novel = await db.novel.create({
      data: {
        ownerId: owner.id,
        title,
        description,
        titleMy,
        descriptionMy: `${titleMy} ၏ ဇာတ်လမ်းသည် ဤနေရာမှ စတင်သည်။`,
        genre,
        hidden: false,
        slug: slugify(title),
        createdAt: now,
        updatedAt: now,
      },
    });
    await db.chapter.createMany({
      data: chapterTitles.map((chapterTitle, index) => ({
        novelId: novel.id,
        number: index + 1,
        title: chapterTitle,
        body: `${title}, chapter ${index + 1}. ${description}`,
        titleMy: chapterTitle,
        bodyMy: burmeseBody(titleMy, chapterTitle, index + 1),
        hidden: false,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }
  await db.$disconnect();
  console.log("Seeded 5 authors, 20 novels, 10 chapters each.");
  console.log("Reader login: reader@novelle.test / password1");
}

void main();
