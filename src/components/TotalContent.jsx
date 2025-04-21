import React, { useState } from 'react';
import Header from './Header';
import Maincontent from './Maincontent';
import SideBar from './SideBar';
export default function TotalContent({ setactivepage, activepage ,onLogout}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <Header />
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <SideBar setactivepage={setactivepage} setIsOpen={setIsOpen} isOpen={isOpen} onLogout={onLogout}/>

            {/* Main content area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white shadow-md shadow-blue-200 p-4 flex items-center ml-[25px] rounded-tl-[30px] rounded-bl-[2px]">

                    <button 
                        onClick={() => setIsOpen(!isOpen)} 
                        className="sm:hidden text-black text-2xl mr-4 focus:outline-none hover:text-blue-600 transition"
                    >
                        ☰
                    </button>
                    <h2 className="text-xl font-semibold text-gray-800 ">
                        {activepage === 'Dashboard' && 'Dashboard'}
                        {activepage === 'Transactions' && 'Transaction'}
                        {activepage === 'Addmoney' && 'Add Transaction'}
                        {activepage === 'Budget' && 'Budget Planning'}
                    </h2>
                </header>
                {/* Main Content */}
                <Maincontent setactivepage={setactivepage} activepage={activepage}  />
            </div>
        </div>
        </>
    );
}
