import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';
import Header from '../header';
import Footer from '../footer';

const LandlordLayout: React.FC = () => {
    return (
        <div className="landlord-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <Outlet />
                <Footer />
            </div>
        </div>
    );
};

export default LandlordLayout;
