import type { AuthUser } from "../lib/auth";
import { notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { PAYOUT_THRESHOLD, getNextPayout } from "../lib/royalty";

// Authors only ever see their own books; admins can see anyone's.
function scope(user: AuthUser, authorId?: string) {
  if (user.role === "AUTHOR") return { authorId: user.authorId ?? "" };
  return authorId ? { authorId } : {};
}

export async function listBooks(user: AuthUser, authorId?: string) {
  const books = await prisma.book.findMany({
    where: scope(user, authorId),
    orderBy: [{ publicationDate: { sort: "desc", nulls: "first" } }, { title: "asc" }],
    include: { author: { select: { id: true, user: { select: { name: true } } } } },
  });

  const sum = (pick: (book: (typeof books)[number]) => number) =>
    books.reduce((total, book) => total + pick(book), 0);

  const royaltyPending = sum((book) => book.royaltyPending);
  const payout = getNextPayout();

  return {
    books: books.map(({ author, ...book }) => ({
      ...book,
      author: { id: author.id, name: author.user.name },
    })),
    summary: {
      totalBooks: books.length,
      published: books.filter((book) => book.status === "PUBLISHED").length,
      inProduction: books.filter((book) => book.status !== "PUBLISHED").length,
      copiesSold: sum((book) => book.totalCopiesSold),
      royaltyEarned: sum((book) => book.totalRoyaltyEarned),
      royaltyPaid: sum((book) => book.royaltyPaid),
      royaltyPending,
      nextPayout: {
        quarter: payout.quarterLabel,
        dueBy: payout.payoutDueBy,
        threshold: PAYOUT_THRESHOLD,
        eligible: royaltyPending >= PAYOUT_THRESHOLD,
      },
    },
  };
}

export async function getBook(user: AuthUser, id: string) {
  const book = await prisma.book.findFirst({ where: { id, ...scope(user) } });
  if (!book) throw notFound("Book");
  return book;
}
