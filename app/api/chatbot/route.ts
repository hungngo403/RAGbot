import { NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import fs from "fs/promises";
import path from "path";

let vectorstore: MemoryVectorStore;

// ChatModel
const initVectorStore = async () => {
  const filePath = path.join(
    process.cwd(),
    "data",
    "cleaned_rental_listings.json"
  );
  const jsonData = JSON.parse(await fs.readFile(filePath, "utf8"));

  const docs = jsonData.map(
    (item: any) =>
      new Document({
        pageContent: `Address: ${item.formattedAddress || "N/A"}\nType: ${
          item.propertyType || "N/A"
        }\nPrice: $${item.price || "N/A"}\nBedrooms: ${
          item.bedrooms || "N/A"
        }\nBathrooms: ${item.bathrooms || "N/A"}\nCity: ${
          item.city || "N/A"
        }\nState: ${item.state || "N/A"}\nStatus: ${item.status || "N/A"}`,
        metadata: {
          id: item.id || `${item.formattedAddress}_${item.price}`,
          price: item.price,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          propertyType: item.propertyType,
          address: item.formattedAddress,
        },
      })
  );

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 50,
  });

  const splits = await textSplitter.splitDocuments(docs);
  const embeddings = new OpenAIEmbeddings();

  // Use MemoryVectorStore instead of Chroma
  vectorstore = await MemoryVectorStore.fromDocuments(splits, embeddings);
};

const removeDuplicateProperties = function (documents: Document[]) {
  const seen = new Set();
  return documents.filter((doc) => {
    const propertyId = doc.metadata.id;
    if (!seen.has(propertyId)) {
      seen.add(propertyId);
      return true;
    }
    return false;
  });
};

const formatDocs = (docs: Document[]) => {
  const uniqueDocs = removeDuplicateProperties(docs);

  return uniqueDocs
    .map(
      (doc, index) =>
        `${index + 1}. Address: ${doc.metadata.address || "N/A"}\n` +
        `   Type: ${doc.metadata.propertyType || "N/A"}\n` +
        `   Price: $${doc.metadata.price || "N/A"}\n` +
        `   Bedrooms: ${doc.metadata.bedrooms || "N/A"}\n` +
        `   Bathrooms: ${doc.metadata.bathrooms || "N/A"}\n`
    )
    .join("\n\n");
};

const promptTemplate = `
You are a real estate assistant. Analyze these properties based on the user's requirements:

Requirements:
{question}

Available Properties:
{context}

If there are matching properties, provide from Lowest to Highest price:

If no properties match ALL requirements, clearly state:
1. Which requirements weren't met
2. The closest available options
3. Suggestions for adjusting requirements

`;

const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  maxTokens: 700,
  temperature: 0,
});

const rag_chain = RunnableSequence.from([
  {
    context: async (input: string) => {
      const retriever = vectorstore.asRetriever({ k: 30 });
      const docs = await retriever.getRelevantDocuments(input);
      return formatDocs(docs);
    },
    question: new RunnablePassthrough(),
  },
  PromptTemplate.fromTemplate(promptTemplate),
  llm,
  new StringOutputParser(),
]);

export async function POST(req: Request) {
  if (!vectorstore) {
    await initVectorStore();
  }

  const { userRequirements } = await req.json();

  try {
    const response = await rag_chain.invoke(userRequirements);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in chatbot API:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
