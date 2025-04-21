import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { productsAPI } from '../services/api';

const PendingProductsPage = () => {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getPending();
      setPendingProducts(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des produits en attente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await productsAPI.approve(id);
      setPendingProducts(pendingProducts.filter(product => product._id !== id));
      setSuccess('Produit approuvé avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de l\'approbation du produit');
      console.error(err);
    }
  };

  const openRejectModal = (product) => {
    setSelectedProduct(product);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    try {
      await productsAPI.reject(selectedProduct._id, rejectionReason);
      setPendingProducts(pendingProducts.filter(product => product._id !== selectedProduct._id));
      setShowRejectModal(false);
      setSuccess('Produit rejeté avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors du rejet du produit');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-5">Chargement des produits en attente...</div>;
  }

  return (
    <div>
      <h1 className="mb-4">Produits en attente d'approbation</h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {pendingProducts.length === 0 ? (
        <Alert variant="info">Aucun produit en attente d'approbation</Alert>
      ) : (
        <Row xs={1} md={2} lg={3} xl={4} className="g-4">
          {pendingProducts.map(product => (
            <Col key={product._id}>
              <Card className="h-100">
                {product.images && product.images.length > 0 ? (
                  <Card.Img 
                    variant="top" 
                    src={product.images[0]} 
                    style={{ height: '200px', objectFit: 'cover' }} 
                  />
                ) : (
                  <div className="bg-light text-center p-5">Pas d'image</div>
                )}
                <Card.Body>
                  <Card.Title>{product.name}</Card.Title>
                  <Card.Text className="text-muted mb-1">
                    Prix: {product.price} DT
                  </Card.Text>
                  <Card.Text className="text-muted mb-1">
                    Catégorie: {product.category}
                  </Card.Text>
                  <Card.Text className="text-muted small mb-3">
                    Par: {product.artisan?.fullName || 'Inconnu'}
                  </Card.Text>
                  <Card.Text>
                    {product.description?.substring(0, 100)}
                    {product.description?.length > 100 ? '...' : ''}
                  </Card.Text>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between">
                  <Button 
                    variant="success" 
                    size="sm" 
                    onClick={() => handleApprove(product._id)}
                  >
                    Approuver
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => openRejectModal(product)}
                  >
                    Rejeter
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rejeter le produit</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <>
              <p>Êtes-vous sûr de vouloir rejeter le produit <strong>{selectedProduct.name}</strong> ?</p>
              <Form.Group>
                <Form.Label>Raison du rejet</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez pourquoi ce produit est rejeté"
                  required
                />
              </Form.Group>
            </>
          )}
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

export default PendingProductsPage;