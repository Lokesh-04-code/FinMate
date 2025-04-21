import React from 'react';
import Dashboard from '../Main_Content/Dashboard/Dashboard';
import TransactionList from '../Main_Content/Transaction';
import Add_money from '../Main_Content/Trasactions/Add_money';
import AddTransaction from '../Main_Content/Trasactions/AddTransaction';

import BudgetPlanning from '../Main_Content/Budget/BudgetPlanning';

const Maincontent = ({setactivepage,activepage}) => {
    return (
        <>
        
        <main className="flex-1 p-2 ml-[25px]">
                    {activepage === 'Dashboard' && <Dashboard/>}
                    {activepage === 'Transactions' && <TransactionList setactivepage={setactivepage} />}
                    {activepage === 'AddTransaction' && (
                        <AddTransaction />
                    )}
                    {activepage === 'Addmoney' && <Add_money setactivepage={setactivepage} />}
                    {activepage === 'Budget' && (
                        <>
                            <BudgetPlanning/>
                        </>
                    )}
                    {/* Add more components based on activepage */}
                    {}
                </main></>
    )
}

export default Maincontent
