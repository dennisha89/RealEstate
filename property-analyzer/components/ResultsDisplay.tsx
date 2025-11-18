import type { AnalysisResult } from "@/app/page";

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "STRONG BUY":
        return "bg-green-100 border-green-500 text-green-800";
      case "BUY":
        return "bg-blue-100 border-blue-500 text-blue-800";
      case "HOLD":
        return "bg-yellow-100 border-yellow-500 text-yellow-800";
      case "PASS":
        return "bg-red-100 border-red-500 text-red-800";
      default:
        return "bg-gray-100 border-gray-500 text-gray-800";
    }
  };

  const getRecommendationEmoji = (rec: string) => {
    switch (rec) {
      case "STRONG BUY":
        return "🔥";
      case "BUY":
        return "👍";
      case "HOLD":
        return "⚠️";
      case "PASS":
        return "❌";
      default:
        return "📊";
    }
  };

  return (
    <div className="mt-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{result.address}</h2>
        <div className={`inline-flex items-center px-6 py-3 rounded-lg border-2 ${getRecommendationColor(result.recommendation)}`}>
          <span className="text-3xl mr-3">{getRecommendationEmoji(result.recommendation)}</span>
          <div>
            <p className="text-sm font-medium">AI Score: {result.score}/100</p>
            <p className="text-xl font-bold">{result.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Estimated Value</p>
            <p className="text-xl font-bold text-gray-900">${result.estimatedValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Beds / Baths</p>
            <p className="text-xl font-bold text-gray-900">{result.bedrooms} / {result.bathrooms}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Square Feet</p>
            <p className="text-xl font-bold text-gray-900">{result.sqft.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Est. Monthly Rent</p>
            <p className="text-xl font-bold text-gray-900">${result.estimatedRent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Financial Analysis */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Analysis</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Monthly Income</span>
            <span className="font-semibold text-green-600">+${result.estimatedRent.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Mortgage (P&I)</span>
            <span className="font-semibold text-red-600">-${result.monthlyMortgage.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Total Expenses (Tax, Insurance, Mgmt, etc.)</span>
            <span className="font-semibold text-red-600">-${result.monthlyExpenses.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center py-4 bg-gray-50 px-4 rounded-lg">
            <span className="font-bold text-gray-900 text-lg">Net Monthly Cash Flow</span>
            <span className={`font-bold text-xl ${result.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {result.monthlyCashFlow >= 0 ? "+" : ""}${result.monthlyCashFlow.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Cap Rate</p>
            <p className="text-3xl font-bold text-blue-600">{result.capRate.toFixed(2)}%</p>
            <p className="text-xs text-gray-500 mt-1">Annual return on property value</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Cash-on-Cash Return</p>
            <p className="text-3xl font-bold text-purple-600">{result.cashOnCashReturn.toFixed(2)}%</p>
            <p className="text-xs text-gray-500 mt-1">Annual return on cash invested</p>
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">✅ Positives</h4>
            <ul className="list-disc list-inside space-y-1">
              {result.explanation.positives.map((item, i) => (
                <li key={i} className="text-gray-700">{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-red-700 mb-2">⚠️ Concerns</h4>
            <ul className="list-disc list-inside space-y-1">
              {result.explanation.negatives.map((item, i) => (
                <li key={i} className="text-gray-700">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
