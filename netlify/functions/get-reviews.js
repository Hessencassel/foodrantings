// netlify/functions/get-reviews.js
// Fetches approved (verified) form submissions from Netlify Forms API
// and returns them as JSON for the front end to render.
//
// Required environment variable in Netlify dashboard:
//   NETLIFY_ACCESS_TOKEN  — a personal access token from app.netlify.com/user/applications
//   NETLIFY_SITE_ID       — found in Site Settings → General → Site ID

exports.handler = async () => {
  const { NETLIFY_ACCESS_TOKEN, NETLIFY_SITE_ID } = process.env;

  if (!NETLIFY_ACCESS_TOKEN || !NETLIFY_SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables.' }),
    };
  }

  try {
    // 1. Find the form named "rant-submission"
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms`,
      { headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` } }
    );
    const forms = await formsRes.json();
    const rantForm = forms.find(f => f.name === 'rant-submission');

    if (!rantForm) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify([]),
      };
    }

    // 2. Fetch only verified (approved) submissions
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${rantForm.id}/submissions?verified=true`,
      { headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` } }
    );
    const submissions = await subRes.json();

    // 3. Shape the data for the front end
    const reviews = submissions.map(s => ({
      id: s.id,
      restaurant: s.data.restaurant || 'Unknown',
      rating: s.data.rating || '?',
      rant: s.data.rant || '',
      author: s.data.author || 'Anonymous Eater',
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(reviews),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
