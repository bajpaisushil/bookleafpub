import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { BookStatus } from "../src/generated/prisma/client";

const AUTHOR_PASSWORD = "author123";
const ADMIN_PASSWORD = "admin123";

interface SampleBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

interface SampleAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: SampleBook[];
}

// The sample data uses display strings like "In Production - Cover Design".
const STATUS_BY_LABEL: Record<string, BookStatus> = {
  "Manuscript Received": BookStatus.MANUSCRIPT_RECEIVED,
  Editing: BookStatus.EDITING,
  "Cover Design": BookStatus.COVER_DESIGN,
  Typesetting: BookStatus.TYPESETTING,
  Proofreading: BookStatus.PROOFREADING,
  "ISBN Assignment": BookStatus.ISBN_ASSIGNMENT,
  Printing: BookStatus.PRINTING,
  "Distribution Setup": BookStatus.DISTRIBUTION_SETUP,
  "Published & Live": BookStatus.PUBLISHED,
};

function toBookStatus(label: string): BookStatus {
  const stage = label.replace("In Production - ", "").trim();
  const status = STATUS_BY_LABEL[stage];
  if (!status) throw new Error(`Unknown book status "${label}"`);
  return status;
}

const toDate = (value: string | null) => (value ? new Date(value) : null);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

async function main() {
  const file = new URL("./data/bookleaf_sample_data.json", import.meta.url);
  const data = JSON.parse(readFileSync(file, "utf8")) as { authors: SampleAuthor[] };

  // Deployments run the seed on every start with SEED_IF_EMPTY=true, so a
  // restart never wipes tickets created during a demo.
  if (process.env.SEED_IF_EMPTY === "true" && (await prisma.user.count()) > 0) {
    console.log("Database already has data, skipping seed.");
    return;
  }

  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.aiCall.deleteMany(),
    prisma.ticketEvent.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.book.deleteMany(),
    prisma.author.deleteMany(),
    prisma.user.deleteMany(),
    prisma.$executeRaw`ALTER SEQUENCE "Ticket_number_seq" RESTART WITH 1001`,
  ]);

  const [authorHash, adminHash] = await Promise.all([
    hashPassword(AUTHOR_PASSWORD),
    hashPassword(ADMIN_PASSWORD),
  ]);

  console.log(`Seeding ${data.authors.length} authors...`);
  for (const author of data.authors) {
    await prisma.user.create({
      data: {
        email: author.email.toLowerCase(),
        name: author.name,
        role: "AUTHOR",
        passwordHash: authorHash,
        author: {
          create: {
            id: author.author_id,
            phone: author.phone,
            city: author.city,
            joinedDate: new Date(author.joined_date),
            books: {
              create: author.books.map((book) => ({
                id: book.book_id,
                title: book.title,
                isbn: book.isbn,
                genre: book.genre,
                publicationDate: toDate(book.publication_date),
                status: toBookStatus(book.status),
                mrp: book.mrp,
                authorRoyaltyPerCopy: book.author_royalty_per_copy,
                totalCopiesSold: book.total_copies_sold,
                totalRoyaltyEarned: book.total_royalty_earned,
                royaltyPaid: book.royalty_paid,
                royaltyPending: book.royalty_pending,
                lastRoyaltyPayoutDate: toDate(book.last_royalty_payout_date),
                printPartner: book.print_partner,
                availableOn: book.available_on,
              })),
            },
          },
        },
      },
    });
  }

  console.log("Seeding admin users...");
  const neha = await prisma.user.create({
    data: { email: "admin@bookleaf.demo", name: "Neha Verma", role: "ADMIN", passwordHash: adminHash },
  });
  await prisma.user.create({
    data: { email: "ops@bookleaf.demo", name: "Rahul Mehta", role: "ADMIN", passwordHash: adminHash },
  });

  console.log("Seeding demo tickets...");
  // Category and priority are left empty on purpose: the API classifies
  // pending tickets on startup, so the demo exercises the real pipeline.
  const demoTickets = [
    {
      authorId: "AUTH003",
      bookId: "BK005",
      subject: "Still no royalty payment for Between Two Temples",
      description:
        "Hi, my book Between Two Temples was published in July 2024 and I can see sales in my dashboard, but I have not received a single royalty payment so far. It has been many months now. Can someone tell me what is going on and when I will be paid?",
      createdAt: hoursAgo(50),
    },
    {
      authorId: "AUTH002",
      bookId: "BK003",
      subject: "Amazon shows a different ISBN than my printed book",
      description:
        "The Amazon India listing for Code & Karma shows an ISBN that does not match the ISBN printed on the back cover of my author copies. Readers are asking me which one is correct. Please fix this urgently.",
      createdAt: hoursAgo(5),
    },
    {
      authorId: "AUTH004",
      bookId: "BK006",
      subject: "Author copies have blurry images and misaligned pages",
      description:
        "I received my 20 author copies of Debugging Life yesterday and the print quality is really poor. The diagrams in chapter 3 are blurry and several pages are misaligned. I have a book launch event coming up and cannot use these copies.",
      createdAt: hoursAgo(74),
      status: "IN_PROGRESS" as const,
      assigneeId: neha.id,
      firstResponseAt: hoursAgo(70),
      messages: [
        {
          senderId: neha.id,
          isInternal: true,
          body: "Checked with the Delhi print floor: batch printed on the older press. Reprint can be prioritised once photos arrive.",
          createdAt: hoursAgo(71),
        },
        {
          senderId: neha.id,
          isInternal: false,
          body: "Hi Vikram,\n\nI'm really sorry your author copies arrived in this condition, especially with your launch coming up. Could you please share a few photos of the blurry diagrams and the misaligned pages? As soon as we verify them, we'll arrange a free reprint, which usually takes 5–7 business days.\n\nWarm regards,\nNeha, BookLeaf Author Support",
          createdAt: hoursAgo(70),
        },
      ],
    },
    {
      authorId: "AUTH005",
      bookId: "BK009",
      subject: "Letters from Lakshadweep shows 'Currently unavailable' on Amazon US",
      description:
        "A friend in the US tried to order Letters from Lakshadweep and Amazon US says 'Currently unavailable'. It was available last month. Can you check?",
      createdAt: hoursAgo(26),
    },
    {
      authorId: "AUTH009",
      bookId: "BK015",
      subject: "Raising Roots has been in typesetting for 3 weeks",
      description:
        "It has been three weeks and my book Raising Roots is still showing as typesetting. When will it move to the next stage? I was hoping to launch it before Diwali.",
      createdAt: hoursAgo(150),
    },
    {
      authorId: "AUTH007",
      bookId: "BK011",
      subject: "Royalty amount seems too low",
      description:
        "I sold around 200 copies of The Algorithm of Love last quarter but only received about ₹3,000. That seems very low. How is the royalty calculated?",
      createdAt: hoursAgo(20),
    },
    {
      authorId: "AUTH001",
      bookId: "BK001",
      subject: "Can I update my book description on Amazon?",
      description:
        "Whispers of the Ganges is already live. I would like to rewrite the book description on Amazon to mention a recent award. Is that possible after publication?",
      createdAt: hoursAgo(200),
      status: "RESOLVED" as const,
      assigneeId: neha.id,
      firstResponseAt: hoursAgo(190),
      resolvedAt: hoursAgo(190),
      messages: [
        {
          senderId: neha.id,
          isInternal: false,
          body: "Hi Priya,\n\nCongratulations on the award! Yes, you can update the description even though the book is live. Submit the new text from your dashboard (or reply here with it) and we'll push it to all platforms. Changes usually reflect within 3–5 business days.\n\nWarm regards,\nNeha, BookLeaf Author Support",
          createdAt: hoursAgo(190),
        },
      ],
    },
    {
      authorId: "AUTH006",
      bookId: null,
      subject: "How do I update my author bio?",
      description: "I'd like to update my author bio and photo across all platforms. What's the process?",
      createdAt: hoursAgo(320),
      status: "CLOSED" as const,
      firstResponseAt: hoursAgo(300),
      resolvedAt: hoursAgo(300),
      messages: [
        {
          senderId: neha.id,
          isInternal: false,
          body: "Hi Arjun,\n\nThanks for reaching out! Please email your updated bio and a high-resolution photo to our team and we'll update every platform for you. Changes typically reflect within 3–5 business days.\n\nWarm regards,\nNeha, BookLeaf Author Support",
          createdAt: hoursAgo(300),
        },
      ],
    },
  ];

  for (const { messages = [], ...ticket } of demoTickets) {
    const author = await prisma.author.findUniqueOrThrow({ where: { id: ticket.authorId } });
    await prisma.ticket.create({
      data: {
        ...ticket,
        updatedAt: messages.at(-1)?.createdAt ?? ticket.createdAt,
        messages: { create: messages },
        events: {
          create: [{ actorId: author.userId, message: "Ticket created", createdAt: ticket.createdAt }],
        },
      },
    });
  }

  console.log("Done.");
  console.log(`  Authors: <email from dataset> / ${AUTHOR_PASSWORD}`);
  console.log(`  Admins:  admin@bookleaf.demo, ops@bookleaf.demo / ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
