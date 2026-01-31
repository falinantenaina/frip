import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../utils/api';

const Rapports = () => {
  const [periode, setPeriode] = useState('month');
  const [loading, setLoading] = useState(true);
  const [rapportGlobal, setRapportGlobal] = useState(null);
  const [rapportParJour, setRapportParJour] = useState([]);
  const [rapportParBalle, setRapportParBalle] = useState([]);

  useEffect(() => {
    loadRapports();
  }, [periode]);

  const loadRapports = async () => {
    setLoading(true);
    try {
      const dateParams = getDateParams();

      const [globalRes, jourRes, balleRes] = await Promise.all([
        api.get(`/rapports/global${dateParams}`),
        api.get(`/rapports/par-jour${dateParams}`),
        api.get('/rapports/par-balle'),
      ]);

      setRapportGlobal(globalRes.data.data);
      setRapportParJour(jourRes.data.data.slice(0, 30).reverse());
      setRapportParBalle(balleRes.data.data.slice(0, 10));
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateParams = () => {
    const now = new Date();
    let dateDebut, dateFin;

    switch (periode) {
      case 'today':
        dateDebut = format(now, 'yyyy-MM-dd');
        dateFin = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        dateDebut = format(subDays(now, 7), 'yyyy-MM-dd');
        dateFin = format(now, 'yyyy-MM-dd');
        break;
      case 'month':
        dateDebut = format(startOfMonth(now), 'yyyy-MM-dd');
        dateFin = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'year':
        dateDebut = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
        dateFin = format(now, 'yyyy-MM-dd');
        break;
      default:
        return '';
    }

    return `?dateDebut=${dateDebut}&dateFin=${dateFin}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Rapports et Statistiques</h1>
      </div>

      {/* Filtre de période */}
      <div className="card mb-20">
        <div className="flex-between">
          <div>
            <label className="form-label mb-10">Période</label>
            <select
              className="form-select"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      {rapportGlobal && (
        <div className="stats-grid mb-20">
          <div className="stat-card">
            <div className="stat-icon blue">
              <span>📊</span>
            </div>
            <div className="stat-info">
              <h3>{rapportGlobal.ventes.totalVentes}</h3>
              <p>Ventes totales</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <span>💰</span>
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(rapportGlobal.ventes.montantVentes)} AR</h3>
              <p>Chiffre d'affaires</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">
              <span>💸</span>
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(rapportGlobal.depenses.totalDepenses)} AR</h3>
              <p>Dépenses totales</p>
            </div>
          </div>

          <div className="stat-card">
            <div className={`stat-icon ${rapportGlobal.beneficeNet >= 0 ? 'green' : 'red'}`}>
              <span>📈</span>
            </div>
            <div className="stat-info">
              <h3 className={rapportGlobal.beneficeNet >= 0 ? 'text-success' : 'text-danger'}>
                {formatCurrency(rapportGlobal.beneficeNet)} AR
              </h3>
              <p>Bénéfice net</p>
            </div>
          </div>
        </div>
      )}

      {/* Graphique ventes par jour */}
      <div className="card mb-20">
        <h3 className="card-title mb-20">Évolution des ventes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={rapportParJour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value) + ' AR'} />
            <Legend />
            <Line type="monotone" dataKey="montantVentes" stroke="#2563eb" name="Ventes" />
            <Line type="monotone" dataKey="depenses" stroke="#ef4444" name="Dépenses" />
            <Line type="monotone" dataKey="benefice" stroke="#10b981" name="Bénéfice" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance par balle */}
      <div className="card">
        <h3 className="card-title mb-20">Performance par balle</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={rapportParBalle}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value) + ' AR'} />
            <Legend />
            <Bar dataKey="prixAchat" fill="#64748b" name="Prix d'achat" />
            <Bar dataKey="totalVentes" fill="#2563eb" name="Ventes" />
            <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" />
            <Bar dataKey="benefice" fill="#10b981" name="Bénéfice" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau détaillé par balle */}
      <div className="card mt-20">
        <h3 className="card-title mb-20">Détails par balle</h3>
        <div className="table-container">
          {rapportParBalle.length === 0 ? (
            <p className="no-data">Aucune donnée</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Balle</th>
                  <th>Prix d'achat</th>
                  <th>Ventes</th>
                  <th>Dépenses</th>
                  <th>Bénéfice</th>
                  <th>Marge (%)</th>
                </tr>
              </thead>
              <tbody>
                {rapportParBalle.map((balle) => {
                  const marge = balle.prixAchat > 0
                    ? ((balle.benefice / balle.prixAchat) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <tr key={balle.id}>
                      <td>
                        <strong>{balle.nom}</strong>
                        <br />
                        <small className="text-secondary">{balle.numero}</small>
                      </td>
                      <td>{formatCurrency(balle.prixAchat)} AR</td>
                      <td>
                        {formatCurrency(balle.totalVentes)} AR
                        <br />
                        <small className="text-secondary">
                          {balle.nombreVentes} vente{balle.nombreVentes > 1 ? 's' : ''}
                        </small>
                      </td>
                      <td>{formatCurrency(balle.depenses)} AR</td>
                      <td>
                        <strong className={balle.benefice >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(balle.benefice)} AR
                        </strong>
                      </td>
                      <td>
                        <strong className={parseFloat(marge) >= 0 ? 'text-success' : 'text-danger'}>
                          {marge}%
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rapports;
