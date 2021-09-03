import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateCart = (updatedCart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    setCart(updatedCart);
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (productStock.amount === 0) {
        toast.error('Quantidade solicitada fora de estoque');
      }

      const cartProduct = cart.find(product => product.id === productId);

      if (!cartProduct) {
        const { data: product } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`);

        const updatedCart = [
          ...cart,
          {
            ...product,
            amount: 1,
          },
        ];

        updateCart(updatedCart);
      } else {
        const newCartProductAmount = cartProduct.amount + 1;

        if (newCartProductAmount > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          
          return;
        }

        const updatedCart = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount: newCartProductAmount,
            };
          }

          return product;
        });

        updateCart(updatedCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);

      if (!cartProduct) {
        toast.error('Erro na remoção do produto');

        return;
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      updateCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        }

        return product;
      });

      updateCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
