// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import { NextResponse } from "next/server";
import { aiResponse } from "@/app/utils/groqClient";
import { scrapeUrl, urlPattern } from "@/app/utils/scraper";

export async function POST(req: Request) {
  try {
    const { message, messages } = await req.json();

    console.log("Message received:", message);
    console.log("Messages:", messages);

    // Extract URL from the message
    const urlMatch = message.match(urlPattern);
    const url = urlMatch ? urlMatch[0] : null; // Extract the first match

    let scrapedContent = "";
    if (url) {
      console.log("URL found:", url);
      const scraperResponse = await scrapeUrl(url);
      if (scraperResponse && scraperResponse.content) {
        // Truncate scraped content to avoid exceeding token limits
        scrapedContent = scraperResponse.content.slice(0, 5000);
        console.log("Scraped content:", scrapedContent);
      }
    }

    if (!scrapedContent) {
      return NextResponse.json({
        message: "No valid content found to summarize.",
      });
    }

    // Extract user's query by removing URL if present
    const userQuery = message.replace(url, "").trim();
    if (!userQuery) {
      return NextResponse.json({
        message: "Please provide a valid question along with the URL.",
      });
    }

    // Construct prompt for the LLM
    const userPrompt = `
    Answer my question: "${userQuery}" 

    Based on the following content:
    <content>
      ${scrapedContent}
    </content>
    `;

    const llmMessages = [
      ...messages,
      {
        role: "user",
        content: userPrompt,
      },
    ];
    console.log("LLM Messages:", llmMessages);

    // Call the LLM
    const response = await aiResponse(llmMessages);

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({
      message: "Error processing your request. Please try again later.",
    });
  }
}
