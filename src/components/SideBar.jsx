import React from 'react'

const SideBar = ({setactivepage,setIsOpen,isOpen,onLogout}) => {
  return (
    <>
        <div className={`bg-blue-700 text-white w-64 space-y-8 p-6 transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                fixed sm:relative sm:translate-x-0 top-0 left-0 h-full z-50`}>
                
                {/* Sidebar header with close button */}
                <div className="flex items-center justify-between border-b border-blue-600 pb-6">
                    <h1 className="text-2xl font-bold">Home</h1>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="sm:hidden text-white text-2xl hover:text-blue-300 transition"
                    >
                        &times;
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-4 ">
                    <button 
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600 transition w-full text-left"
                        onClick={() => {
                            setactivepage('Dashboard');
                            setIsOpen(false);
                        }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Dashboard
                    </button>
                    <button 
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600 transition w-full text-left"
                        onClick={() => {setactivepage('Addmoney'); setIsOpen(false);}}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Transactions
                    </button>
                    <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600 transition" onClick={()=>{setactivepage('Budget')}}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"  />
                        </svg>
                        Budget Planning
                    </a>
                    <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600 transition" onClick={() => {
                            setactivepage('Transactions');
                            setIsOpen(false); // Close sidebar on mobile after selection
                        }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Transaction History
                    </a>
                    <button 
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600 transition w-full text-left"  onClick={onLogout}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                    </button>
                </nav>
            </div>
    </>
    )
}

export default SideBar
