import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Check, AlertTriangle, Share2 } from 'lucide-react';

const CHECKLIST_TEMPLATE = [
  { category: 'Документы', items: [
    { name: 'Совпадение VIN с ПТС', score: 10, critical: true, possible_tags: ['Перебит', 'Не читается', 'Отсутствует табличка', 'Ошибка в ПТС'] },
    { name: 'Читаемость VIN', score: 5, critical: false, possible_tags: ['Ржавчина', 'Поврежден', 'Затерт', 'Грязь'] },
    { name: 'Юридическая чистота', score: 10, critical: true, possible_tags: ['Залог', 'Арест', 'Угон', 'Аннулирован учет', 'Штрафы'] }
  ]},
  { category: 'Кузов', items: [
    { name: 'Лакокрасочное покрытие', score: 2, critical: false, possible_tags: ['Царапины', 'Вмятины', 'Сколы', 'Отслоение лака', 'Шпаклевка', 'Разнотон'] },
    { name: 'Зазоры и швы', score: 4, critical: false, possible_tags: ['Кривые зазоры', 'Следы съема деталей', 'Неоригинальные швы', 'Отсутствует герметик'] },
    { name: 'Отсутствие коррозии', score: 3, critical: false, possible_tags: ['Ржавчина на арках', 'Ржавчина на порогах', 'Ржавчина на днище', 'Сквозная коррозия'] },
    { name: 'Состояние лонжеронов', score: 10, critical: true, possible_tags: ['Следы ремонта', 'Складки', 'Сварка', 'Нарушена геометрия'] }
  ]},
  { category: 'Двигатель', items: [
    { name: 'Запуск двигателя', score: 3, critical: false, possible_tags: ['Долгий старт', 'Не заводится', 'Стартер щелкает', 'Плавают обороты'] },
    { name: 'Отсутствие посторонних шумов', score: 10, critical: true, possible_tags: ['Стук гидрокомпенсаторов', 'Стук поршневой', 'Шум цепи/ремня', 'Свист роликов'] },
    { name: 'Цвет выхлопа', score: 4, critical: false, possible_tags: ['Сизый дым (масло)', 'Черный дым (топливо)', 'Белый дым (антифриз)'] },
    { name: 'Отсутствие течей', score: 3, critical: false, possible_tags: ['Течь масла', 'Течь антифриза', 'Запотевание', 'Эмульсия'] }
  ]},
  { category: 'Трансмиссия', items: [
    { name: 'Плавность переключения', score: 10, critical: true, possible_tags: ['Пинки', 'Затягивает передачи', 'Хруст', 'Не включается передача'] },
    { name: 'Отсутствие рывков', score: 5, critical: false, possible_tags: ['Рывки при разгоне', 'Рывки при торможении', 'Удары при загрузке (R/D)'] },
    { name: 'Отсутствие задержек', score: 4, critical: false, possible_tags: ['Долгое включение', 'Пробуксовка'] }
  ]},
  { category: 'Ходовая часть', items: [
    { name: 'Отсутствие люфтов', score: 3, critical: false, possible_tags: ['Люфт рулевой рейки', 'Люфт ступичного подшипника', 'Люфт шаровых', 'Сайлентблоки'] },
    { name: 'Состояние амортизаторов', score: 2, critical: false, possible_tags: ['Течь', 'Стук', 'Раскачка', 'Пробои'] },
    { name: 'Состояние тормозов', score: 2, critical: false, possible_tags: ['Износ колодок', 'Износ дисков', 'Биение при торможении', 'Течь тормозной жидкости'] }
  ]},
  { category: 'Электрика', items: [
    { name: 'Отсутствие ошибок (Check Engine)', score: 4, critical: false, possible_tags: ['Горит Check', 'Ошибки в памяти', 'Сброшены недавно'] },
    { name: 'Система безопасности (Airbag)', score: 5, critical: false, possible_tags: ['Горит Airbag', 'Стреляные подушки', 'Обманки', 'Нет пиропатронов'] },
    { name: 'Работа кондиционера', score: 2, critical: false, possible_tags: ['Не холодит', 'Шум компрессора', 'Утечка фреона', 'Не дует'] }
  ]},
  { category: 'Салон', items: [
    { name: 'Состояние руля', score: 1, critical: false, possible_tags: ['Затерт', 'Перешит', 'Липкий', 'Поврежден'] },
    { name: 'Состояние сидений', score: 1, critical: false, possible_tags: ['Просижены', 'Дырки', 'Грязь', 'Сломан механизм'] }
  ]},
  { category: 'Тест-драйв', items: [
    { name: 'Динамика разгона', score: 3, critical: false, possible_tags: ['Не тянет', 'Провалы', 'Дергается'] },
    { name: 'Эффективность торможения', score: 5, critical: false, possible_tags: ['Ватная педаль', 'Уводит в сторону', 'Скрип'] },
    { name: 'Отсутствие вибраций', score: 3, critical: false, possible_tags: ['Вибрация на руле', 'Вибрация по кузову', 'Вибрация при торможении'] }
  ]}
];

export default function InspectOrder() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    fetchOrder();
    // Initialize checklist state
    const initialChecklist: any[] = [];
    CHECKLIST_TEMPLATE.forEach(cat => {
      cat.items.forEach(item => {
        initialChecklist.push({
          category: cat.category,
          item_name: item.name,
          value: 0, // 0 means no issue
          state: 'EXCELLENT', // EXCELLENT, GOOD, BAD
          is_critical: item.critical,
          max_score: item.score,
          possible_tags: item.possible_tags,
          selected_tags: []
        });
      });
    });
    setChecklist(initialChecklist);
  }, [id]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setOrder(await res.json());
    }
  };

  const handleStateChange = (index: number, state: 'EXCELLENT' | 'GOOD' | 'BAD') => {
    const newChecklist = [...checklist];
    newChecklist[index].state = state;
    if (state === 'EXCELLENT') newChecklist[index].value = 0;
    if (state === 'GOOD') newChecklist[index].value = Math.ceil(newChecklist[index].max_score / 2);
    if (state === 'BAD') newChecklist[index].value = newChecklist[index].max_score;
    
    // Clear tags if not BAD
    if (state !== 'BAD') {
      newChecklist[index].selected_tags = [];
    }
    
    setChecklist(newChecklist);
  };

  const handleTagToggle = (index: number, tag: string) => {
    const newChecklist = [...checklist];
    const currentTags = newChecklist[index].selected_tags || [];
    
    if (currentTags.includes(tag)) {
      newChecklist[index].selected_tags = currentTags.filter((t: string) => t !== tag);
    } else {
      newChecklist[index].selected_tags = [...currentTags, tag];
    }
    setChecklist(newChecklist);
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/jpeg', 0.7); // 70% quality
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const compressedFiles: File[] = [];
      
      for (const file of filesArray) {
        if (file.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(file);
            compressedFiles.push(compressed);
          } catch (err) {
            console.error('Failed to compress image:', err);
            compressedFiles.push(file); // Fallback to original
          }
        } else {
          compressedFiles.push(file);
        }
      }
      
      setPhotos(prev => [...prev, ...compressedFiles]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('items', JSON.stringify(checklist));
    photos.forEach(photo => {
      formData.append('photos', photo);
    });

    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      let responseData: any = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        responseData = data;
      } else {
        const text = await res.text();
        if (!res.ok) {
          if (res.status === 413) {
            throw new Error('Размер фотографий слишком велик. Пожалуйста, уменьшите размер или количество фото.');
          }
          throw new Error(`Ошибка сервера (${res.status}): ${text.substring(0, 100)}`);
        }
      }
      
      if (waNumber) {
        const resultText = responseData?.result === 'GREEN' ? 'ЗЕЛЕНЫЙ (Рекомендуется)' : 
                           responseData?.result === 'YELLOW' ? 'ЖЕЛТЫЙ (Есть замечания)' : 
                           'КРАСНЫЙ (Высокий риск)';
                           
        const message = `Здравствуйте! Отчет об осмотре автомобиля ${order.brand} ${order.model} (${order.year}) готов.\n\nРезультат: ${resultText}`;
        
        const cleanNumber = waNumber.replace(/\D/g, '');
        const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
      }
      
      navigate(`/orders/${id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!order) return <div className="p-4 text-center">Загрузка...</div>;

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen pb-20">
      <div className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold">Осмотр #{order.id}</h1>
        <p className="text-sm opacity-90">{order.brand} {order.model} ({order.year})</p>
        <p className="text-sm opacity-90 font-mono">VIN: {order.vin}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Оцените состояние каждого параметра</h2>
          
          {CHECKLIST_TEMPLATE.map((category, catIdx) => (
            <div key={catIdx} className="space-y-4">
              <h3 className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{category.category}</h3>
              <div className="space-y-4 pl-2">
                {category.items.map((item, itemIdx) => {
                  const globalIdx = checklist.findIndex(c => c.category === category.category && c.item_name === item.name);
                  const currentState = checklist[globalIdx]?.state || 'EXCELLENT';
                  return (
                    <div key={itemIdx} className="flex flex-col space-y-2 p-3 rounded bg-gray-50 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        {item.critical && <span className="text-xs text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded">Критичный параметр</span>}
                      </div>
                      <div className="flex space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`item-${globalIdx}`}
                            className="focus:ring-indigo-500 h-4 w-4 text-green-600 border-gray-300"
                            checked={currentState === 'EXCELLENT'}
                            onChange={() => handleStateChange(globalIdx, 'EXCELLENT')}
                          />
                          <span className="text-sm text-gray-700">Отличное</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`item-${globalIdx}`}
                            className="focus:ring-indigo-500 h-4 w-4 text-yellow-500 border-gray-300"
                            checked={currentState === 'GOOD'}
                            onChange={() => handleStateChange(globalIdx, 'GOOD')}
                          />
                          <span className="text-sm text-gray-700">Хорошее</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`item-${globalIdx}`}
                            className="focus:ring-indigo-500 h-4 w-4 text-red-600 border-gray-300"
                            checked={currentState === 'BAD'}
                            onChange={() => handleStateChange(globalIdx, 'BAD')}
                          />
                          <span className="text-sm text-gray-700">Плохое</span>
                        </label>
                      </div>
                      
                      {currentState === 'BAD' && checklist[globalIdx]?.possible_tags && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Выберите теги, описывающие проблему:</p>
                          <div className="flex flex-wrap gap-2">
                            {checklist[globalIdx].possible_tags.map((tag: string, tagIdx: number) => {
                              const isSelected = checklist[globalIdx].selected_tags?.includes(tag);
                              
                              return (
                                <button
                                  key={tagIdx}
                                  type="button"
                                  onClick={() => handleTagToggle(globalIdx, tag)}
                                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                    isSelected 
                                      ? 'bg-red-100 text-red-800 border-red-300' 
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Фотографии ({photos.length})</h2>
          <p className="text-xs text-gray-500">Рекомендуется: VIN, спереди, сзади, сбоку, двигатель, салон, повреждения.</p>
          
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-w-1 aspect-h-1">
                <img src={URL.createObjectURL(photo)} alt="Preview" className="object-cover rounded-lg w-full h-full" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  &times;
                </button>
              </div>
            ))}
            <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 cursor-pointer aspect-w-1 aspect-h-1 min-h-[100px]">
              <Camera className="w-8 h-8 mb-1" />
              <span className="text-xs">Добавить</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>

        <div className="pt-6 space-y-4">
          <div>
            <label htmlFor="waNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Номер WhatsApp получателя (необязательно)
            </label>
            <input
              type="text"
              id="waNumber"
              placeholder="Например: 996555123456"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md py-3 px-4 border"
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className={`w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${submitting ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            {submitting ? 'Отправка...' : 'Отправить отчет на WhatsApp'}
            {!submitting && <Share2 className="ml-2 w-6 h-6" />}
          </button>
        </div>
      </form>
    </div>
  );
}
