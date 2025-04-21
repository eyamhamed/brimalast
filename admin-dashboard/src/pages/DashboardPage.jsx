import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { dashboardAPI } from '../services/api';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        setStats(response.data);
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-5">Chargement des statistiques...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <h1 className="mb-4">Tableau de bord</h1>
      
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <h2 className="display-4">{stats?.counts?.users || 0}</h2>
              <Card.Title>Utilisateurs</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <h2 className="display-4">{stats?.counts?.artisans?.total || 0}</h2>
              <Card.Title>Artisans</Card.Title>
              <div className="small text-muted">
                {stats?.counts?.artisans?.pending || 0} en attente
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <h2 className="display-4">{stats?.counts?.products?.total || 0}</h2>
              <Card.Title>Produits</Card.Title>
              <div className="small text-muted">
                {stats?.counts?.products?.pending || 0} en attente
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="text-center">
              <h2 className="display-4">{stats?.counts?.collaborators?.total || 0}</h2>
              <Card.Title>Collaborateurs</Card.Title>
              <div className="small text-muted">
                {stats?.counts?.collaborators?.pending || 0} en attente
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;