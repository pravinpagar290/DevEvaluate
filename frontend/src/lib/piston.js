const JUDGE0_API = "https://ce.judge0.com";

const LANGUAGE_MAP = {
  javascript: 63,
  python: 71,
  java: 62,
};

export async function executeCode(language, code) {
  try {
    const languageId = LANGUAGE_MAP[language];

    if (!languageId) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    // STEP 1: Submit code
    const submitResponse = await fetch(
      `${JUDGE0_API}/submissions?base64_encoded=false&wait=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
        }),
      }
    );

    const submitData = await submitResponse.json();

    // 🔴 IMPORTANT CHECK
    if (!submitData.token) {
      return {
        success: false,
        error: "Failed to get token",
        details: submitData,
      };
    }

    const token = submitData.token;

    // STEP 2: Poll result (LIMITED retries)
    let result;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(
        `${JUDGE0_API}/submissions/${token}?base64_encoded=false`
      );

      result = await res.json();

      if (result.status && result.status.id >= 3) break;

      await new Promise((r) => setTimeout(r, 1500));
    }

    // STEP 3: Handle output
    if (result.stderr) {
      return {
        success: false,
        error: result.stderr,
      };
    }

    return {
      success: true,
      output: result.stdout || "No output",
    };

  } catch (error) {
    return {
      success: false,
      error: `Execution failed: ${error.message}`,
    };
  }
}