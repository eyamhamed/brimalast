import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Nav, Navbar, Button } from 'react-bootstrap';
import { 
  FaTachometerAlt, 
  FaUsers, 
  FaBox, 
  FaHandshake, 
  FaCalendarAlt, 
  FaSignOutAlt 
} from 'react-icons/fa';

const AdminLayout = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };
  
  return (
    <div className="admin-layout">
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Navbar.Brand href="/dashboard">Brimasouk Admin</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll" className="justify-content-end">
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleLogout}
              className="d-flex align-items-center"
            >
              <FaSignOutAlt className="me-2" /> Logout
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Container fluid>
        <Row>
          <Col md={3} lg={2} className="sidebar">
            <Nav className="flex-column">
              <Nav.Link 
                href="/dashboard" 
                className="d-flex align-items-center py-2 text-secondary"
              >
                <FaTachometerAlt className="me-2" /> Dashboard
              </Nav.Link>
              <Nav.Link 
                href="/artisans/pending"
                className="d-flex align-items-center py-2 text-secondary"
              >
                <FaUsers className="me-2" /> Artisans à approuver
              </Nav.Link>
              <Nav.Link 
                href="/products/pending"
                className="d-flex align-items-center py-2 text-secondary"
              >
                <FaBox className="me-2" /> Produits à approuver
              </Nav.Link>
              <Nav.Link 
                href="/collaborators/pending"
                className="d-flex align-items-center py-2 text-secondary"
              >
                <FaHandshake className="me-2" /> Collaborateurs
              </Nav.Link>
              <Nav.Link 
                href="/events/pending"
                className="d-flex align-items-center py-2 text-secondary"
              >
                <FaCalendarAlt className="me-2" /> Événements
              </Nav.Link>
            </Nav>
          </Col>
          
          <Col md={9} lg={10} className="main-content p-4">
            <Outlet />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminLayout;