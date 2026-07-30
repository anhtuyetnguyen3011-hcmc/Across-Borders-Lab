import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  console.error("POSTGRES_PRISMA_URL not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.performanceMetric.deleteMany();
  await prisma.scheduledPost.deleteMany();
  await prisma.reviewItem.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.styleSample.deleteMany();
  await prisma.idea.deleteMany();

  // Seed ideas
  const ideas = await Promise.all([
    prisma.idea.create({
      data: {
        id: "idea-1",
        text: "5 bài học từ việc chuyển sang làm freelance sau 5 năm corporate",
        source: "manual",
        pillar: "career",
        platform: "threads",
        priorityScore: 92,
        priority: "high",
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-2",
        text: "Tại sao mình chọn sống ở Đà Nẵng thay vì Sài Gòn cho người làm remote",
        source: "manual",
        pillar: "lifestyle",
        platform: "website",
        priorityScore: 85,
        priority: "high",
        createdAt: new Date(Date.now() - 86400000 * 3),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-3",
        text: "Review công cụ AI giúp tăng năng suất 3x cho content creator",
        source: "link",
        pillar: "education",
        platform: "threads",
        priorityScore: 78,
        priority: "medium",
        referenceLink: "https://example.com/ai-tools-review",
        createdAt: new Date(Date.now() - 86400000 * 1),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-4",
        text: "Quan điểm: Tại sao 'hustle culture' đang giết chết thế hệ trẻ",
        source: "trend",
        pillar: "education",
        platform: "website",
        priorityScore: 88,
        priority: "high",
        createdAt: new Date(Date.now() - 86400000 * 0.5),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-5",
        text: "Chi tiết cách mình quản lý tài chính cá nhân bằng spreadsheet",
        source: "manual",
        pillar: "education",
        platform: "website",
        priorityScore: 65,
        priority: "medium",
        createdAt: new Date(Date.now() - 86400000 * 5),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-6",
        text: "5 cuốn sách thay đổi tư duy mình trong năm 2026",
        source: "audio",
        pillar: "career",
        platform: "threads",
        priorityScore: 71,
        priority: "medium",
        createdAt: new Date(Date.now() - 86400000 * 4),
      },
    }),
    prisma.idea.create({
      data: {
        id: "idea-7",
        text: "Một ngày làm việc của mình: 6h productivity, 2h family, 2h learning",
        source: "manual",
        pillar: "lifestyle",
        platform: "threads",
        priorityScore: 60,
        priority: "low",
        createdAt: new Date(Date.now() - 86400000 * 6),
      },
    }),
  ]);
  console.log(`  ✅ ${ideas.length} ideas`);

  // Seed drafts
  const drafts = await Promise.all([
    prisma.draft.create({
      data: {
        id: "draft-1",
        ideaId: "idea-1",
        platform: "threads",
        pillar: "career",
        title: "5 bài học từ Freelance sau 5 năm Corporate",
        hook: "Sau 5 năm ngồi văn phòng, mình quyết định nghỉ việc. Đây là 5 điều mình ước ai nói cho mình sớm hơn.",
        body: `1️⃣ Income không ổn định ≠ income thấp\n\nTháng đầu tiên freelance mình kiếm được 40 triệu. Tháng tiếp theo chỉ 8 triệu. Nhưng trung bình năm đầu mình vẫn hơn lúc đi làm.\n\n2️⃣ Bạn cần discipline hơn cả lúc đi làm\n\nKhông ai bắt bạn schedule 9h sáng. Nhưng nếu bạn không tự kỷ luật, 1 năm sau bạn sẽ ở trong phòng ngủ lúc 2h chiều vẫn còn pyjamas.\n\n3️⃣ Network = Net worth\n\n80% khách hàng mình đến từ referral. Invest vào relationships.\n\n4️⃣ Học cách nói "không"\n\nClient xấu = poison. 10 năm kinh nghiệm cho mình bài học đắt nhất.\n\n5️⃣ Mental health là priority #1\n\nBurnout không có gì cool cả. Freelance cho bạn freedom, nhưng cũng cho bạn freedom to destroy yourself.`,
        outline: "5 numbered lessons, each with short explanation",
        version: 2,
        versionHistory: JSON.stringify([
          { version: 1, body: "Original draft content...", hook: "Mình đã nghỉ việc sau 5 năm. Đây là 5 bài học.", createdAt: new Date(Date.now() - 86400000).toISOString() },
          { version: 2, body: "Updated content with more detail...", hook: "Sau 5 năm ngồi văn phòng, mình quyết định nghỉ việc. Đây là 5 điều mình ước ai nói cho mình sớm hơn.", createdAt: new Date(Date.now() - 3600000).toISOString() },
        ]),
        aiModel: "gpt-4o",
        status: "needs_review",
        originalityRisk: 15,
        isStyleReference: true,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 3600000),
      },
    }),
    prisma.draft.create({
      data: {
        id: "draft-2",
        ideaId: "idea-2",
        platform: "website",
        pillar: "lifestyle",
        title: "Tại Sao Mình Chọn Đà Nẵng: Cuộc Sống Remote Worker Ở Việt Nam",
        hook: "Sau 2 năm sống và làm việc từ cả Sài Gòn, Hà Nội, lẫn Đà Nẵng, mình đã đưa ra quyết định cuối cùng.",
        body: `## Vấn đề với Sài Gòn\n\nTraffic, khói bụi, chi phí leo thang... \n\n## Tại sao Đà Nẵng?\n\nChi phí sống thấp hơn 40%, internet fiber nhanh, cộng đồng digital nomad đang phát triển mạnh.\n\n## Schedule hàng ngày của mình\n\n5h30 - Thức dậy, chạy bộ ở bãi biển\n7h00 - Bắt đầu work\n12h00 - Lunch + break\n14h00 - Afternoon session\n17h00 - Off work, explore\n20h00 - Reading / learning`,
        outline: "Long-form article comparing cities, personal schedule, practical tips",
        metaDescription: "Kinh nghiệm sống và làm việc từ Đà Nẵng cho digital nomad Việt Nam",
        targetKeyword: "digital nomad đà nẵng",
        version: 1,
        versionHistory: JSON.stringify([
          { version: 1, body: "Full article content...", hook: "Sau 2 năm sống và làm việc từ cả Sài Gòn, Hà Nội, lẫn Đà Nẵng...", createdAt: new Date(Date.now() - 72000000).toISOString() },
        ]),
        aiModel: "gpt-4o",
        status: "approved",
        originalityRisk: 8,
        isStyleReference: true,
        createdAt: new Date(Date.now() - 72000000),
        updatedAt: new Date(Date.now() - 36000000),
      },
    }),
    prisma.draft.create({
      data: {
        id: "draft-3",
        ideaId: "idea-3",
        platform: "threads",
        pillar: "education",
        title: "5 AI Tools Tăng Năng Suất 3x",
        hook: "Mình đã test 20+ công cụ AI trong 6 tháng. Chỉ 5 tools này mới thực sự đáng tiền.",
        body: `1️⃣ Cursor - Viết code 3x nhanh hơn\n\nAI coding assistant tốt nhất hiện tại. Không phải copilot.\n\n2️⃣ Notion AI - Quản lý knowledge\n\nTích hợp AI vào workflow quản lý project.\n\n3️⃣ Descript - Edit video/audio\n\nTranscription + editing trong 1 tool.\n\n4️⃣ Perplexity - Research\n\nGoogle replacement cho người làm nội dung.\n\n5️⃣ Opus Clip - Repurpose content\n\nBiến video dài thành shorts/threads tự động.`,
        outline: "5 tools with short reviews, each with use case",
        version: 1,
        versionHistory: "[]",
        aiModel: "gpt-4o",
        status: "needs_review",
        originalityRisk: 22,
        isStyleReference: false,
        createdAt: new Date(Date.now() - 54000000),
        updatedAt: new Date(Date.now() - 54000000),
      },
    }),
    prisma.draft.create({
      data: {
        id: "draft-4",
        ideaId: "idea-4",
        platform: "website",
        pillar: "education",
        title: "Hustle Culture Đang Giết Chết Thế Hệ Trẻ: Tại Sao Mình Nghĩ vậy",
        hook: "Thế hệ chúng ta bị ám ảnh bởi 'hustle' đến mức quên mất rằng nghỉ ngơi cũng là productive.",
        body: "Full article about hustle culture critique...",
        outline: "Opinion piece on hustle culture with data and personal stories",
        metaDescription: "Phân tích tác động của hustle culture lên thế hệ trẻ Việt Nam",
        targetKeyword: "hustle culture việt nam",
        version: 1,
        versionHistory: "[]",
        aiModel: "gpt-4o",
        status: "draft",
        originalityRisk: 5,
        isStyleReference: false,
        createdAt: new Date(Date.now() - 18000000),
        updatedAt: new Date(Date.now() - 18000000),
      },
    }),
  ]);
  console.log(`  ✅ ${drafts.length} drafts`);

  // Seed reviews
  await Promise.all([
    prisma.reviewItem.create({
      data: {
        id: "review-1",
        draftId: "draft-1",
        status: "pending",
        aiRiskNotes: JSON.stringify([
          "Hook có thể trùng với nhiều bài viết về freelance",
          "Tone hơi casual cho platform Threads",
        ]),
        reviewerComments: "",
        createdAt: new Date(Date.now() - 3600000),
      },
    }),
    prisma.reviewItem.create({
      data: {
        id: "review-2",
        draftId: "draft-3",
        status: "pending",
        aiRiskNotes: JSON.stringify([
          "Danh sách tools có thể đã có nhiều bài tương tự",
          "Nên thêm personal experience cụ thể hơn",
        ]),
        reviewerComments: "",
        createdAt: new Date(Date.now() - 1800000),
      },
    }),
  ]);
  console.log("  ✅ 2 reviews");

  // Seed scheduled posts
  await prisma.scheduledPost.create({
    data: {
      id: "sched-1",
      draftId: "draft-2",
      platform: "website",
      scheduledTime: new Date(Date.now() + 86400000),
      publishStatus: "queued",
      retryCount: 0,
      createdAt: new Date(Date.now() - 36000000),
    },
  });
  console.log("  ✅ 1 scheduled post");

  // Seed "old" placeholders referenced by performance metrics
  for (let i = 1; i <= 7; i++) {
    await prisma.draft.create({
      data: {
        id: `draft-old-${i}`,
        ideaId: "idea-1",
        platform: "threads",
        pillar: "education",
        title: `Old Post ${i}`,
        hook: `Performance tracking post ${i}`,
        body: `Body content for post ${i}`,
        outline: "",
        version: 1,
        versionHistory: "[]",
        aiModel: "gpt-4o (mock)",
        status: "approved",
        originalityRisk: 5,
        isStyleReference: false,
        createdAt: new Date(Date.now() - 86400000 * i),
        updatedAt: new Date(Date.now() - 86400000 * i),
      },
    });
    await prisma.scheduledPost.create({
      data: {
        id: `sched-old-${i}`,
        draftId: `draft-old-${i}`,
        platform: i % 2 === 0 ? "website" : "threads",
        scheduledTime: new Date(Date.now() - 86400000 * i),
        publishStatus: "published",
        retryCount: 0,
        createdAt: new Date(Date.now() - 86400000 * i),
      },
    });
  }
  console.log("  ✅ 7 placeholder drafts + scheduled posts (for metrics)");

  // Seed performance metrics
  await Promise.all([
    prisma.performanceMetric.create({
      data: {
        id: "metric-1",
        scheduledPostId: "sched-old-1",
        draftId: "draft-old-1",
        platform: "threads",
        pillar: "career",
        views: 12450,
        likes: 890,
        comments: 134,
        engagementRate: 8.2,
        capturedAt: new Date(Date.now() - 86400000 * 5),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-2",
        scheduledPostId: "sched-old-2",
        draftId: "draft-old-2",
        platform: "website",
        pillar: "lifestyle",
        views: 8900,
        likes: 567,
        comments: 89,
        engagementRate: 7.4,
        capturedAt: new Date(Date.now() - 86400000 * 4),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-3",
        scheduledPostId: "sched-old-3",
        draftId: "draft-old-3",
        platform: "threads",
        pillar: "education",
        views: 6780,
        likes: 445,
        comments: 67,
        engagementRate: 7.5,
        capturedAt: new Date(Date.now() - 86400000 * 3),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-4",
        scheduledPostId: "sched-old-4",
        draftId: "draft-old-4",
        platform: "threads",
        pillar: "education",
        views: 15200,
        likes: 1100,
        comments: 203,
        engagementRate: 8.5,
        capturedAt: new Date(Date.now() - 86400000 * 2),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-5",
        scheduledPostId: "sched-old-5",
        draftId: "draft-old-5",
        platform: "website",
        pillar: "career",
        views: 4300,
        likes: 312,
        comments: 45,
        engagementRate: 8.3,
        capturedAt: new Date(Date.now() - 86400000),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-6",
        scheduledPostId: "sched-old-6",
        draftId: "draft-old-6",
        platform: "threads",
        pillar: "lifestyle",
        views: 21000,
        likes: 1560,
        comments: 278,
        engagementRate: 8.8,
        capturedAt: new Date(Date.now() - 86400000 * 6),
      },
    }),
    prisma.performanceMetric.create({
      data: {
        id: "metric-7",
        scheduledPostId: "sched-old-7",
        draftId: "draft-old-7",
        platform: "website",
        pillar: "education",
        views: 9800,
        likes: 723,
        comments: 112,
        engagementRate: 8.5,
        capturedAt: new Date(Date.now() - 86400000 * 7),
      },
    }),
  ]);
  console.log("  ✅ 7 performance metrics");

  console.log("\n✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
