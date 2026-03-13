import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CAR_DATA: Record<string, string[]> = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Highlander', 'Prius', 'Другая'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Fit', 'HR-V', 'Другая'],
  'Hyundai': ['Sonata', 'Elantra', 'Tucson', 'Santa Fe', 'Accent', 'Другая'],
  'Kia': ['Rio', 'Optima', 'Sportage', 'Sorento', 'Cerato', 'Другая'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'Другая'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5', '7 Series', 'Другая'],
  'Lexus': ['RX', 'ES', 'LX', 'NX', 'IS', 'Другая'],
  'Nissan': ['Altima', 'Sentra', 'Rogue', 'Qashqai', 'Patrol', 'Другая'],
  'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'Touareg', 'Другая'],
  'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A8', 'Другая'],
  'Ford': ['Focus', 'Mustang', 'Explorer', 'Escape', 'Fusion', 'Другая'],
  'Chevrolet': ['Cruze', 'Malibu', 'Tahoe', 'Equinox', 'Camaro', 'Другая'],
  'Другая': ['Другая модель']
};

const ADDRESSES = [
  'Точка Медерова',
  'Точка Океева',
  'Точка Автосервис'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

export default function CreateOrder() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    vin: '',
    license_plate: '',
    inspection_address: '',
    seller_phone: '',
    preferred_time: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'vin') {
      const formattedVin = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
      setFormData({ ...formData, vin: formattedVin });
    } else if (name === 'brand') {
      setFormData({ ...formData, brand: value, model: '' }); // Reset model when brand changes
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новый осмотр</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Марка</label>
            <select name="brand" required value={formData.brand} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="" disabled>Выберите марку</option>
              {Object.keys(CAR_DATA).map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Модель</label>
            <select name="model" required value={formData.model} onChange={handleChange} disabled={!formData.brand} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100">
              <option value="" disabled>Выберите модель</option>
              {formData.brand && CAR_DATA[formData.brand]?.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Год выпуска</label>
            <select name="year" required value={formData.year} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="" disabled>Выберите год</option>
              {YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">VIN номер</label>
            <input type="text" name="vin" required value={formData.vin} onChange={handleChange} placeholder="17 символов" minLength={17} maxLength={17} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Гос. номер</label>
            <input type="text" name="license_plate" value={formData.license_plate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Телефон клиента/продавца</label>
            <input type="tel" name="seller_phone" required value={formData.seller_phone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Адрес осмотра</label>
            <select name="inspection_address" required value={formData.inspection_address} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="" disabled>Выберите точку осмотра</option>
              {ADDRESSES.map(address => (
                <option key={address} value={address}>{address}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Время осмотра</label>
            <input type="datetime-local" name="preferred_time" required value={formData.preferred_time} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Создать осмотр
          </button>
        </div>
      </form>
    </div>
  );
}
