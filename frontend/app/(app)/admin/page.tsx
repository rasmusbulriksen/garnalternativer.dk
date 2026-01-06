'use client';

import { useState, useEffect } from 'react';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

interface YarnOption {
  yarn_id: number;
  name: string;
  yarn_type: string;
}

export default function AdminPage() {
  const [showQuickActivate, setShowQuickActivate] = useState(false);
  const [yarnIdToActivate, setYarnIdToActivate] = useState('');
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null);
  const [yarnType, setYarnType] = useState<'single' | 'double'>('single');
  const [singleYarns, setSingleYarns] = useState<YarnOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    tension: '',
    skein_length: '',
    lowest_price_on_the_market: '',
    price_per_meter: '',
    main_yarn_id: '',
    carry_along_yarn_id: '',
    is_active: true,
    search_query: '',
    expanded_search_query: '',
    negative_keywords: ''
  });

  useEffect(() => {
    fetchSingleYarns();
  }, []);

  const fetchSingleYarns = async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/yarns/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch yarns');
      }
      const data = await response.json();
      setSingleYarns(data);
    } catch (err) {
      console.error('Error fetching yarns:', err);
      setError('Failed to load existing yarns');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNegativeKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, negative_keywords: value }));
  };


  const handleActivateYarn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateLoading(true);
    setActivateError(null);
    setActivateSuccess(null);

    try {
      const yarnId = parseInt(yarnIdToActivate);
      if (isNaN(yarnId)) {
        throw new Error('Invalid yarn ID');
      }

      const response = await fetch(`${BACKEND_API_URL}/yarns/${yarnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate yarn');
      }

      const result = await response.json();
      setActivateSuccess(`Yarn "${result.yarn.name}" (ID: ${yarnId}) activated successfully!`);
      setYarnIdToActivate('');
      setTimeout(() => setShowQuickActivate(false), 2000);
    } catch (err: any) {
      setActivateError(err.message || 'Failed to activate yarn');
    } finally {
      setActivateLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        image_url: formData.image_url || null,
        tension: formData.tension ? parseInt(formData.tension) : null,
        skein_length: formData.skein_length ? parseInt(formData.skein_length) : null,
        lowest_price_on_the_market: formData.lowest_price_on_the_market ? parseInt(formData.lowest_price_on_the_market) : null,
        price_per_meter: formData.price_per_meter ? parseFloat(formData.price_per_meter) : null,
        yarn_type: yarnType,
        is_active: formData.is_active,
        search_query: formData.search_query || null,
        expanded_search_query: formData.expanded_search_query || null,
        negative_keywords: formData.negative_keywords 
          ? formData.negative_keywords.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0)
          : null
      };

      if (yarnType === 'double') {
        payload.main_yarn_id = parseInt(formData.main_yarn_id);
        payload.carry_along_yarn_id = parseInt(formData.carry_along_yarn_id);
      }

      const response = await fetch(`${BACKEND_API_URL}/yarns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create yarn');
      }

      const result = await response.json();
      setSuccess(`Yarn "${result.yarn.name}" created successfully!`);
      
      setFormData({
        name: '',
        description: '',
        image_url: '',
        tension: '',
        skein_length: '',
        lowest_price_on_the_market: '',
        price_per_meter: '',
        main_yarn_id: '',
        carry_along_yarn_id: '',
        is_active: true,
        search_query: '',
        expanded_search_query: '',
        negative_keywords: ''
      });
      
      if (yarnType === 'double') {
        fetchSingleYarns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create yarn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Add New Yarn</h1>
        <button
          type="button"
          onClick={() => setShowQuickActivate(!showQuickActivate)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showQuickActivate ? 'Hide' : 'Show'} Quick Activate
        </button>
      </div>

      {showQuickActivate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Quick Activate Yarn</h2>
          {activateError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3">
              {activateError}
            </div>
          )}
          {activateSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-3">
              {activateSuccess}
            </div>
          )}
          <form onSubmit={handleActivateYarn} className="flex gap-2">
            <input
              type="number"
              value={yarnIdToActivate}
              onChange={(e) => setYarnIdToActivate(e.target.value)}
              placeholder="Enter yarn ID (e.g., 53)"
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              type="submit"
              disabled={activateLoading}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {activateLoading ? 'Activating...' : 'Activate'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Yarn Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="yarn_type"
                value="single"
                checked={yarnType === 'single'}
                onChange={(e) => setYarnType(e.target.value as 'single' | 'double')}
                className="mr-2"
              />
              Single Yarn
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="yarn_type"
                value="double"
                checked={yarnType === 'double'}
                onChange={(e) => setYarnType(e.target.value as 'single' | 'double')}
                className="mr-2"
              />
              Double Yarn
            </label>
          </div>
        </div>

        {yarnType === 'double' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Main Yarn <span className="text-red-500">*</span>
              </label>
              <select
                name="main_yarn_id"
                value={formData.main_yarn_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select main yarn...</option>
                {singleYarns.map(yarn => (
                  <option key={yarn.yarn_id} value={yarn.yarn_id}>
                    {yarn.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Carry-Along Yarn <span className="text-red-500">*</span>
              </label>
              <select
                name="carry_along_yarn_id"
                value={formData.carry_along_yarn_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select carry-along yarn...</option>
                {singleYarns
                  .filter(yarn => yarn.yarn_id.toString() !== formData.main_yarn_id)
                  .map(yarn => (
                    <option key={yarn.yarn_id} value={yarn.yarn_id}>
                      {yarn.name}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., Sandnes Sunday"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Image URL
          </label>
          <input
            type="text"
            name="image_url"
            value={formData.image_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="/yarns/brand/single/yarn-name.webp"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tension
            </label>
            <input
              type="number"
              name="tension"
              value={formData.tension}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Skein Length (meters)
            </label>
            <input
              type="number"
              name="skein_length"
              value={formData.skein_length}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Lowest Price (DKK)
            </label>
            <input
              type="number"
              step="0.01"
              name="lowest_price_on_the_market"
              value={formData.lowest_price_on_the_market}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 45.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Price per Meter (DKK)
            </label>
            <input
              type="number"
              step="0.0001"
              name="price_per_meter"
              value={formData.price_per_meter}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 0.225"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Search Query (searches product name)
          </label>
          <input
            type="text"
            name="search_query"
            value={formData.search_query}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Search terms for matching product names"
          />
          <p className="text-sm text-gray-500 mt-1">
            This search query is always used to search the product name field.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Expanded Search Query (optional - searches all fields)
          </label>
          <input
            type="text"
            name="expanded_search_query"
            value={formData.expanded_search_query}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Optional: search term that searches across name, brand, and category"
          />
          <p className="text-sm text-gray-500 mt-1">
            If provided, this search query will search across all product fields (name, brand, category). Products match if the name matches the search query OR if any field matches the expanded search query.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Negative Keywords (comma-separated)
          </label>
          <input
            type="text"
            name="negative_keywords"
            value={formData.negative_keywords}
            onChange={handleNegativeKeywordsChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., boucl, brushed, silk"
          />
          <p className="text-sm text-gray-500 mt-1">
            Products matching these keywords will be excluded
          </p>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="mr-2"
            />
            Active (visible on frontend)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Yarn'}
        </button>
      </form>
    </div>
  );
}

