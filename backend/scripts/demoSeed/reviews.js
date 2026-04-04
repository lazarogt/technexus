const { assert, pickDistinctWeighted, randomDateBetween, randomInt, weightedPick } = require("./utils");

const REVIEW_COMMENTS = {
  3: [
    "Solid overall value, though setup took longer than expected.",
    "Performance is good, but the packaging and first-run experience could be better.",
    "Works well enough for daily use, with a few minor compromises."
  ],
  4: [
    "Very good quality for the price and it has been reliable so far.",
    "The build feels premium and performance has matched the product description.",
    "Easy to recommend if you want dependable performance without overspending."
  ],
  5: [
    "Excellent purchase. Fast, quiet, and exactly what I wanted for my setup.",
    "One of the best upgrades I have made this year. Great performance and packaging.",
    "Arrived quickly, feels premium, and exceeded my expectations in everyday use."
  ]
};

function pickReviewRating(rng) {
  return weightedPick(rng, [
    { value: 3, weight: 1 },
    { value: 4, weight: 3 },
    { value: 5, weight: 5 }
  ]);
}

function buildReviewDrafts({ products, reviewers, rng }) {
  const drafts = [];

  for (const product of products) {
    const eligibleReviewers = reviewers.filter((reviewer) => reviewer.id !== product.sellerId);
    assert(
      eligibleReviewers.length >= 2,
      `Product ${product.name} requires at least 2 eligible reviewers for demo mode.`
    );

    const reviewCount = Math.min(eligibleReviewers.length, randomInt(rng, 2, 8));
    const pickedReviewers = pickDistinctWeighted(
      rng,
      eligibleReviewers,
      reviewCount,
      (reviewer) => (reviewer.role === "customer" ? 4 : 2)
    );

    for (const reviewer of pickedReviewers) {
      const rating = pickReviewRating(rng);
      const createdAt = randomDateBetween(
        rng,
        new Date(product.createdAt.getTime() + 12 * 60 * 60 * 1000),
        new Date("2026-04-01T18:00:00.000Z")
      );
      const comment = REVIEW_COMMENTS[rating][randomInt(rng, 0, REVIEW_COMMENTS[rating].length - 1)];

      drafts.push({
        productId: product.id,
        userId: reviewer.id,
        rating,
        comment,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 60 * 60 * 1000)
      });
    }
  }

  return drafts;
}

async function seedReviews(tx, { products, reviewers, rng }) {
  const drafts = buildReviewDrafts({ products, reviewers, rng });

  await tx.review.createMany({
    data: drafts
  });

  return drafts.length;
}

module.exports = {
  buildReviewDrafts,
  pickReviewRating,
  seedReviews
};
