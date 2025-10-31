import os
from fastapi import FastAPI
from fastapi import HTTPException
from dotenv import load_dotenv

# LLM structured output via LangChain
from langchain_google_genai import ChatGoogleGenerativeAI
from llm_api.schemas import FiltrosBusca, QueryInput

# Carrega variáveis de ambiente (GOOGLE_API_KEY)
load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise EnvironmentError("Variável de ambiente GOOGLE_API_KEY não definida.")

app = FastAPI(title="LLM API de Filtros", version="0.2.0")

# 1. Inicializa o modelo (flash otimizado para velocidade)
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest")

# 2. Força saída estruturada no formato de FiltrosBusca
structured_llm = llm.with_structured_output(FiltrosBusca)

PROMPT_TEMPLATE = (
    """
Você é um assistente de e-commerce. Seu trabalho é extrair filtros de busca 
de uma consulta em linguagem natural do usuário.

A consulta do usuário é:
"{query_text}"

Analise a consulta e retorne um objeto JSON que corresponda ao 
schema de filtros fornecido.

- 'price_max': Se o usuário disser "até X reais" ou "menos de X".
- 'price_min': Se o usuário disser "a partir de X reais" ou "mais de X".
- 'category': Tente identificar categorias como 'Doces', 'Bebidas', 'Artesanato'.
- 'search_term': Use para palavras-chave que parecem ser nomes de produtos ou descrições.
- Se a consulta for vaga, apenas retorne o 'search_term'.
"""
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/parse-query", response_model=FiltrosBusca)
async def parse_natural_language_query(input: QueryInput):
    """
    Recebe um texto (ex: "doces até 50 reais") e o converte 
    em um JSON de FiltrosBusca.
    """

    prompt = PROMPT_TEMPLATE.format(query_text=input.query)

    try:
        response_json = await structured_llm.ainvoke(prompt)
        return response_json
    except Exception:
        # Fallback seguro: devolve o termo original como search_term
        return FiltrosBusca(search_term=input.query)

