import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { artisansAPI } from '../services/api';

const PendingArtisansPage = () => {
  const [pendingArtisans, setPendingArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedArtisanId, setSelectedArtisanId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingArtisans();
  }, []);

  const fetchPendingArtisans = async () => {
    try {
      setLoading(true);
      const response = await artisansAPI.getPending();
      setPendingArtisans(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des artisans en attente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await artisansAPI.approve(id);
      setPendingArtisans(pendingArtisans.filter(artisan => artisan._id !== id));
      setSuccess('Artisan approuvé avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de l\'approbation de l\'artisan');
      console.error(err);
    }
  };

  const openRejectModal = (id) => {
    setSelectedArtisanId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    try {
      await artisansAPI.reject(selectedArtisanId, rejectionReason);
      setPendingArtisans(pendingArtisans.filter(artisan => artisan._id !== selectedArtisanId));
      setShowRejectModal(false);
      setSuccess('Artisan rejeté avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors du rejet de l\'artisan');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-5">Chargement des artisans en attente...</div>;
  }

  return (
    <div>
      <h1 className="mb-4">Artisans en attente d'approbation</h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {pendingArtisans.length === 0 ? (
        <Alert variant="info">Aucun artisan en attente d'approbation</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Date d'inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingArtisans.map(artisan => (
              <tr key={artisan._id}>
                <td>{artisan.fullName}</td>
                <td>{artisan.email}</td>
                <td>{artisan.phone || 'N/A'}</td>
                <td>{new Date(artisan.createdAt).toLocaleDateString()}</td>
                <td>
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="me-2" 
                    onClick={() => handleApprove(artisan._id)}
                  >
                    Approuver
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => openRejectModal(artisan._id)}
                  >
                    Rejeter
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rejeter l'artisan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Raison du rejet</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi cette demande est rejetée"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={handleReject}
            disabled={!rejectionReason.trim()}
          >
            Confirmer le rejet
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PendingArtisansPage;