import { useState, FormEvent } from 'react';
import { Search, MessageSquare, FileText, Database, Loader } from 'lucide-react';
import { queryService } from '../services/queryService';
import { Card, ErrorFallback } from '../components/ui';

interface Source {
  type: 'semantic' | 'sql';
  source: string;
  relevance: number;
  excerpt?: string;
}

interface QueryResult {
  answer: string;
  sources: Source[];
}

interface HistoryItem {
  question: string;
  answer: string;
  sources: Source[];
}

const Query = (): React.ReactElement => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await queryService.ask(question);
      const data = response.data as QueryResult;
      setResult(data);
      setHistory((prev) => [{ question, answer: data.answer, sources: data.sources }, ...prev]);
      setQuestion('');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      setError(error.response?.data?.message || error.response?.data?.error || 'Error al consultar');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    '¿Cuántos registros tiene el último archivo subido?',
    '¿Cuál es la diferencia entre los archivos analizados?',
    '¿Qué anomalías se detectaron en los datos numéricos?',
    '¿Qué tipo de datos se han procesado?',
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Consultar Datos</h1>
        <p className="text-gray-600">
          Haz preguntas sobre los archivos procesados. El sistema busca en SQL Server y ML semántico.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Qué quieres saber sobre tus datos?"
              className="w-full pl-12 pr-4 py-4 border-2 border-black text-lg focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-8 py-4 bg-black text-white font-bold text-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? <Loader size={24} className="animate-spin" /> : 'Preguntar'}
          </button>
        </div>
      </form>

      {!result && !error && history.length === 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500 mb-3">Ejemplos:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exampleQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="text-left px-4 py-3 border-2 border-gray-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <ErrorFallback error={error} retry={() => setError(null)} />
        </div>
      )}

      {result && (
        <Card className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <MessageSquare size={24} className="text-black mt-1 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg mb-1">Respuesta</p>
              <p className="text-gray-800 whitespace-pre-line">{result.answer}</p>
            </div>
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t-2 border-gray-200">
              <p className="font-medium text-sm text-gray-500 mb-3">Fuentes ({result.sources.length})</p>
              <div className="space-y-2">
                {result.sources.map((src, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {src.type === 'semantic' ? (
                      <Database size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <FileText size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{src.source}</span>
                      <span className="text-gray-400 ml-2">
                        ({src.type === 'semantic' ? 'ML Semántico' : 'SQL'} • {(src.relevance * 100).toFixed(0)}%)
                      </span>
                      {src.excerpt && (
                        <p className="text-gray-600 mt-1">{src.excerpt.substring(0, 200)}{src.excerpt.length > 200 ? '...' : ''}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {history.length > 1 && (
        <Card shadow={false}>
          <h2 className="text-xl font-bold mb-4">Historial</h2>
          <div className="space-y-4">
            {history.slice(1).map((item, i) => (
              <div key={i} className="border-2 border-gray-200 p-4">
                <p className="font-medium text-sm text-gray-500 mb-1">Pregunta:</p>
                <p className="mb-2">{item.question}</p>
                <p className="font-medium text-sm text-gray-500 mb-1">Respuesta:</p>
                <p className="text-gray-700 text-sm whitespace-pre-line">
                  {item.answer.substring(0, 300)}{item.answer.length > 300 ? '...' : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Query;
