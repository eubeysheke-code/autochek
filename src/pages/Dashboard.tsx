import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setOrders(await res.json());
    }
  };

  const fetchInspectors = async () => {
    const res = await fetch('/api/users/inspectors', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setInspectors(await res.json());
    }
  };

  const assignInspector = async (orderId: number, inspectorId: string) => {
    if (!inspectorId) return;
    await fetch(`/api/orders/${orderId}/assign`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ inspector_id: inspectorId })
    });
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот осмотр?')) return;
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Новый</span>;
      case 'IN_PROGRESS': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">В процессе</span>;
      case 'COMPLETED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Завершен</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Мои осмотры
        </h1>
        <Link
          to="/orders/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Новый осмотр
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">Нет заявок</li>
          ) : (
            orders.map(order => (
              <li key={order.id}>
                <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {order.brand} {order.model} ({order.year})
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex flex-col text-sm text-gray-500">
                        <p>VIN: {order.vin}</p>
                        <p>Адрес: {order.inspection_address}</p>
                        <p>Время: {order.preferred_time}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {order.status === 'ASSIGNED' && (
                      <Link
                        to={`/inspect/${order.id}`}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Начать осмотр
                      </Link>
                    )}

                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Подробнее
                    </Link>
                    
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="Удалить"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
