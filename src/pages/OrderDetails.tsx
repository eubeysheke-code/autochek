import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle, AlertTriangle, Info, Share2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function OrderDetails() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setOrder(await res.json());
    }
  };

  if (!order) return <div className="text-center py-12">Загрузка...</div>;

  const getResultColor = (result: string) => {
    if (result === 'GREEN') return 'bg-green-100 text-green-800 border-green-200';
    if (result === 'YELLOW') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (result === 'RED') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getResultIcon = (result: string) => {
    if (result === 'GREEN') return <CheckCircle className="w-8 h-8 text-green-600" />;
    if (result === 'YELLOW') return <Info className="w-8 h-8 text-yellow-600" />;
    if (result === 'RED') return <AlertTriangle className="w-8 h-8 text-red-600" />;
    return null;
  };

  const getResultText = (result: string) => {
    if (result === 'GREEN') return 'Рекомендуется к покупке. Серьезных проблем не найдено.';
    if (result === 'YELLOW') return 'Требуется дополнительная диагностика. Есть замечания.';
    if (result === 'RED') return 'Высокий риск. Покупка не рекомендуется.';
    return '';
  };

  const handleWhatsAppShare = () => {
    if (!order) return;
    if (!waNumber) {
      alert('Пожалуйста, введите номер телефона WhatsApp');
      return;
    }
    
    const resultText = order.result.result === 'GREEN' ? 'ЗЕЛЕНЫЙ (Рекомендуется)' : 
                       order.result.result === 'YELLOW' ? 'ЖЕЛТЫЙ (Есть замечания)' : 
                       'КРАСНЫЙ (Высокий риск)';
                       
    const message = `Здравствуйте! Отчет об осмотре автомобиля ${order.brand} ${order.model} (${order.year}) готов.\n\nРезультат: ${resultText}\n\nОбщий балл: ${order.result.score}`;
    
    // Clean up phone number (remove non-digits)
    const cleanNumber = waNumber.replace(/\D/g, '');
    
    // Create WhatsApp link
    const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  const generatePDF = () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const opt = {
      margin:       10,
      filename:     `report-${order.id}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="report-content">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Осмотр #{order.id}
        </h1>
        {order.status === 'COMPLETED' && (
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 items-end sm:items-center" data-html2canvas-ignore="true">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Номер WhatsApp (напр. 996...)"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              />
              <button
                onClick={handleWhatsAppShare}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 whitespace-nowrap"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Отправить
              </button>
            </div>
            <button
              onClick={generatePDF}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
            >
              <FileText className="w-5 h-5 mr-2" />
              Скачать PDF
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Информация об автомобиле</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Марка и модель</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.brand} {order.model} ({order.year})</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">VIN</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{order.vin}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Адрес осмотра</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.inspection_address}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Телефон клиента/продавца</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{order.seller_phone}</dd>
            </div>
          </dl>
        </div>
      </div>

      {order.status === 'COMPLETED' && order.result && (
        <div className="space-y-6">
          <div className={`border-l-4 p-4 ${getResultColor(order.result.result)}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {getResultIcon(order.result.result)}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">
                  Результат осмотра: {order.result.result === 'GREEN' ? 'ЗЕЛЕНЫЙ' : order.result.result === 'YELLOW' ? 'ЖЕЛТЫЙ' : 'КРАСНЫЙ'}
                </h3>
                <p className="mt-2 text-sm">
                  {getResultText(order.result.result)}
                </p>
                <p className="mt-1 text-sm font-medium">
                  Общий балл риска: {order.result.score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Найденные проблемы</h3>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {order.result.items.filter((i: any) => i.value > 0).length === 0 ? (
                  <li className="px-6 py-4 text-gray-500 text-sm">Проблем не обнаружено.</li>
                ) : (
                  order.result.items.filter((i: any) => i.value > 0).map((item: any) => (
                    <li key={item.id} className="px-4 py-4 sm:px-6 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">[{item.category}] {item.item_name}</p>
                        {item.is_critical ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                            Критично
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-500">
                        Балл: {item.value}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Фотографии</h3>
            </div>
            <div className="border-t border-gray-200 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {order.result.photos.map((photo: any) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="block aspect-w-1 aspect-h-1">
                    <img src={photo.url} alt="Inspection" className="object-cover rounded-lg w-full h-full" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
