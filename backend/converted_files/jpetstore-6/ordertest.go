package domain

import (
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestInitOrder(t *testing.T) {
	// given
	account := Account{}
	account.Username = "mybatis"
	account.Email = "mybatis@example.com"
	account.FirstName = "My"
	account.LastName = "Batis"
	account.Status = "NG"
	account.Address1 = "Address 1"
	account.Address2 = "Address 2"
	account.City = "City"
	account.State = "ST"
	account.Zip = "99001"
	account.Country = "JPN"
	account.Phone = "09012345678"

	cart := Cart{}
	item := Item{}
	item.ItemID = "I01"
	item.ListPrice = big.NewFloat(2.05)
	cart.AddItem(&item, true)
	cart.AddItem(&item, true)

	order := Order{}

	// when
	order.InitOrder(&account, &cart)

	// then
	assert.Equal(t, account.Username, order.Username)
	assert.True(t, order.OrderDate.Before(time.Now()) || order.OrderDate.Equal(time.Now()))
	assert.Equal(t, account.Address1, order.ShipAddress1)
	assert.Equal(t, account.Address2, order.ShipAddress2)
	assert.Equal(t, account.City, order.ShipCity)
	assert.Equal(t, account.State, order.ShipState)
	assert.Equal(t, account.Country, order.ShipCountry)
	assert.Equal(t, account.Zip, order.ShipZip)
	assert.Equal(t, account.Address1, order.BillAddress1)
	assert.Equal(t, account.Address2, order.BillAddress2)
	assert.Equal(t, account.City, order.BillCity)
	assert.Equal(t, account.State, order.BillState)
	assert.Equal(t, account.Country, order.BillCountry)
	assert.Equal(t, account.Zip, order.BillZip)

	expectedTotalPrice, _ := new(big.Float).SetString("4.10")
	assert.Equal(t, expectedTotalPrice.String(), order.TotalPrice.String())

	assert.Equal(t, "999 9999 9999 9999", order.CreditCard)
	assert.Equal(t, "Visa", order.CardType)
	assert.Equal(t, "12/03", order.ExpiryDate)
	assert.Equal(t, "UPS", order.Courier)
	assert.Equal(t, "CA", order.Locale)
	assert.Equal(t, "P", order.Status)
	assert.Len(t, order.LineItems, 1)
	assert.Same(t, &item, order.LineItems[0].Item)
	assert.Equal(t, 1, order.LineItems[0].LineNumber)
	assert.Equal(t, "I01", order.LineItems[0].ItemID)

	expectedUnitPrice, _ := new(big.Float).SetString("2.05")
	assert.Equal(t, expectedUnitPrice.String(), order.LineItems[0].UnitPrice.String())

	assert.Equal(t, 2, order.LineItems[0].Quantity)

	expectedTotal, _ := new(big.Float).SetString("4.10")
	assert.Equal(t, expectedTotal.String(), order.LineItems[0].Total.String())
}